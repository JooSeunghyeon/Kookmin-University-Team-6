-- 피드백 16: 모임(스터디, 운동 등 인원 모집) 기능. 합의된 범위는 무료 모임 +
-- 참여/탈퇴 + 정원 + 댓글까지다(채팅 연동·포인트 결제는 범위 밖).

alter table ai_moderations drop constraint if exists ai_moderations_target_type_check;
alter table ai_moderations add constraint ai_moderations_target_type_check
  check (target_type in (
    'errand', 'application', 'inquiry', 'chat_message', 'nickname', 'review',
    'gathering', 'gathering_comment'
  ));

create table if not exists gatherings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  host_id uuid not null references users (id),
  title text not null,
  description text not null,
  category text not null check (category in ('study', 'sports', 'hobby', 'etc')),
  capacity integer not null check (capacity >= 2 and capacity <= 100),
  meet_at timestamptz,
  place_label text,
  place_lat numeric(9,6),
  place_lng numeric(9,6),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'CANCELLED')),
  member_count integer not null default 1,
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'warned', 'blinded')),
  created_at timestamptz not null default now()
);

create index if not exists idx_gatherings_school_status_created
  on gatherings (school_id, status, created_at desc);

create table if not exists gathering_members (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references gatherings (id) on delete cascade,
  user_id uuid not null references users (id),
  joined_at timestamptz not null default now(),
  unique (gathering_id, user_id)
);

create table if not exists gathering_comments (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references gatherings (id) on delete cascade,
  author_id uuid not null references users (id),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gathering_comments_gathering
  on gathering_comments (gathering_id, created_at asc);

-- =========================================================
-- RLS: 모든 쓰기는 아래 SECURITY DEFINER 함수로만 수행한다(기존 테이블과 동일한 원칙).
-- =========================================================

alter table gatherings enable row level security;
drop policy if exists gatherings_select_own_school on gatherings;
create policy gatherings_select_own_school on gatherings
  for select to authenticated
  using (
    school_id = auth_school_id()
    and (moderation_status <> 'blinded' or host_id = auth.uid() or is_admin())
  );

alter table gathering_members enable row level security;
drop policy if exists gathering_members_select on gathering_members;
create policy gathering_members_select on gathering_members
  for select to authenticated
  using (
    exists (
      select 1 from gatherings g
      where g.id = gathering_members.gathering_id and g.school_id = auth_school_id()
    )
  );

alter table gathering_comments enable row level security;
drop policy if exists gathering_comments_select on gathering_comments;
create policy gathering_comments_select on gathering_comments
  for select to authenticated
  using (
    exists (
      select 1 from gatherings g
      where g.id = gathering_comments.gathering_id and g.school_id = auth_school_id()
    )
  );

-- =========================================================
-- 함수
-- =========================================================

create function fn_create_gathering(
  p_host_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_capacity integer,
  p_meet_at timestamptz,
  p_place_label text,
  p_place_lat numeric,
  p_place_lng numeric
) returns gatherings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_status text;
  v_gathering gatherings;
begin
  select school_id, status into v_school_id, v_status from users where id = p_host_id;
  if v_school_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;
  if v_status <> 'active' then
    raise exception 'USER_SUSPENDED';
  end if;
  if p_category not in ('study', 'sports', 'hobby', 'etc') then
    raise exception 'INVALID_CATEGORY';
  end if;
  if p_capacity < 2 or p_capacity > 100 then
    raise exception 'INVALID_CAPACITY';
  end if;

  insert into gatherings (
    school_id, host_id, title, description, category, capacity,
    meet_at, place_label, place_lat, place_lng, member_count
  ) values (
    v_school_id, p_host_id, p_title, p_description, p_category, p_capacity,
    p_meet_at, p_place_label, p_place_lat, p_place_lng, 1
  )
  returning * into v_gathering;

  insert into gathering_members (gathering_id, user_id) values (v_gathering.id, p_host_id);

  return v_gathering;
end;
$$;

create function fn_join_gathering(
  p_gathering_id uuid,
  p_user_id uuid
) returns gathering_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gathering gatherings;
  v_member gathering_members;
begin
  select * into v_gathering from gatherings where id = p_gathering_id for update;

  if v_gathering.id is null then
    raise exception 'GATHERING_NOT_FOUND';
  end if;

  if v_gathering.status <> 'OPEN' then
    raise exception 'GATHERING_CLOSED';
  end if;

  if exists (select 1 from gathering_members where gathering_id = p_gathering_id and user_id = p_user_id) then
    raise exception 'ALREADY_JOINED';
  end if;

  if v_gathering.member_count >= v_gathering.capacity then
    raise exception 'GATHERING_FULL';
  end if;

  insert into gathering_members (gathering_id, user_id) values (p_gathering_id, p_user_id)
  returning * into v_member;

  update gatherings set member_count = member_count + 1 where id = p_gathering_id;

  perform _notify(
    v_gathering.host_id, 'GATHERING_JOIN', '모임에 새 참여자가 있어요',
    format('%s 모임에 새로운 참여자가 들어왔어요.', v_gathering.title), format('/gatherings/%s', p_gathering_id)
  );

  return v_member;
end;
$$;

create function fn_leave_gathering(
  p_gathering_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gathering gatherings;
begin
  select * into v_gathering from gatherings where id = p_gathering_id for update;

  if v_gathering.id is null then
    raise exception 'GATHERING_NOT_FOUND';
  end if;

  if v_gathering.host_id = p_user_id then
    raise exception 'HOST_CANNOT_LEAVE';
  end if;

  delete from gathering_members where gathering_id = p_gathering_id and user_id = p_user_id;
  if not found then
    raise exception 'NOT_MEMBER';
  end if;

  update gatherings set member_count = greatest(member_count - 1, 0) where id = p_gathering_id;
end;
$$;

create function fn_close_gathering(
  p_gathering_id uuid,
  p_host_id uuid
) returns gatherings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gathering gatherings;
begin
  select * into v_gathering from gatherings where id = p_gathering_id;

  if v_gathering.id is null then
    raise exception 'GATHERING_NOT_FOUND';
  end if;

  if v_gathering.host_id <> p_host_id then
    raise exception 'FORBIDDEN';
  end if;

  update gatherings set status = 'CLOSED' where id = p_gathering_id
  returning * into v_gathering;

  return v_gathering;
end;
$$;

create function fn_add_gathering_comment(
  p_gathering_id uuid,
  p_author_id uuid,
  p_content text
) returns gathering_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gathering gatherings;
  v_comment gathering_comments;
begin
  select * into v_gathering from gatherings where id = p_gathering_id;

  if v_gathering.id is null then
    raise exception 'GATHERING_NOT_FOUND';
  end if;

  insert into gathering_comments (gathering_id, author_id, content)
  values (p_gathering_id, p_author_id, p_content)
  returning * into v_comment;

  if v_gathering.host_id <> p_author_id then
    perform _notify(
      v_gathering.host_id, 'GATHERING_COMMENT', '모임에 새 댓글이 있어요',
      p_content, format('/gatherings/%s', p_gathering_id)
    );
  end if;

  return v_comment;
end;
$$;

-- 새로 만든 함수는 기본적으로 PUBLIC에 EXECUTE가 암묵적으로 부여되므로(0003b의 default
-- privileges 변경이 적용되지 않는 PUBLIC 자체는 그대로 남아 있다) 명시적으로 회수한 뒤
-- authenticated에만 부여한다.
revoke execute on function fn_create_gathering(uuid, text, text, text, integer, timestamptz, text, numeric, numeric) from public;
revoke execute on function fn_join_gathering(uuid, uuid) from public;
revoke execute on function fn_leave_gathering(uuid, uuid) from public;
revoke execute on function fn_close_gathering(uuid, uuid) from public;
revoke execute on function fn_add_gathering_comment(uuid, uuid, text) from public;

grant execute on function fn_create_gathering(uuid, text, text, text, integer, timestamptz, text, numeric, numeric) to authenticated;
grant execute on function fn_join_gathering(uuid, uuid) to authenticated;
grant execute on function fn_leave_gathering(uuid, uuid) to authenticated;
grant execute on function fn_close_gathering(uuid, uuid) to authenticated;
grant execute on function fn_add_gathering_comment(uuid, uuid, text) to authenticated;
