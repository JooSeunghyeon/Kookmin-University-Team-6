-- 캠퍼스런 RLS: "내 학교 데이터만" 강제 (15장 설정 체크 반영)
-- 모든 쓰기(포인트·상태 전이 포함)는 0003_functions.sql의 SECURITY DEFINER 함수로만 수행한다.
-- 이 함수들은 소유자(postgres) 권한으로 실행되어 RLS를 우회하므로, 아래 정책은 주로 SELECT를 규율한다.

-- =========================================================
-- 도우미 함수
-- =========================================================

create or replace function auth_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.users where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and status = 'active'
  );
$$;

grant execute on function auth_school_id() to anon, authenticated;
grant execute on function is_admin() to anon, authenticated;
grant execute on function is_active_account() to anon, authenticated;

-- =========================================================
-- schools / campus_places
-- =========================================================

alter table schools enable row level security;
drop policy if exists schools_select_all on schools;
create policy schools_select_all on schools
  for select to anon, authenticated using (true);

alter table campus_places enable row level security;
drop policy if exists campus_places_select_own_school on campus_places;
create policy campus_places_select_own_school on campus_places
  for select to authenticated using (school_id = auth_school_id());

-- =========================================================
-- users (본인 행만 직접 접근, 공개 정보는 profiles 뷰로)
-- =========================================================

alter table users enable row level security;
drop policy if exists users_select_self_or_admin on users;
create policy users_select_self_or_admin on users
  for select to authenticated
  using (id = auth.uid() or (is_admin() and school_id = auth_school_id()));

-- profiles: 닉네임·온도·완료 수 등 공개 정보만 노출하는 SECURITY-DEFINER 뷰.
-- 뷰 소유자(postgres) 권한으로 users RLS를 우회해 "같은 학교" 범위로 안전하게 공개한다.
drop view if exists profiles;
create view profiles as
select id, school_id, nickname, profile_image_url, campus_temp, completed_count
from users
where school_id = auth_school_id();

grant select on profiles to authenticated;

-- =========================================================
-- errands / errand_images
-- =========================================================

alter table errands enable row level security;
drop policy if exists errands_select_own_school on errands;
create policy errands_select_own_school on errands
  for select to authenticated
  using (
    school_id = auth_school_id()
    and (moderation_status <> 'blinded' or requester_id = auth.uid() or is_admin())
  );

alter table errand_images enable row level security;
drop policy if exists errand_images_select on errand_images;
create policy errand_images_select on errand_images
  for select to authenticated
  using (
    exists (
      select 1 from errands e
      where e.id = errand_images.errand_id and e.school_id = auth_school_id()
    )
  );

-- =========================================================
-- applications
-- =========================================================

alter table applications enable row level security;
drop policy if exists applications_select on applications;
create policy applications_select on applications
  for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      applicant_id = auth.uid()
      or is_admin()
      or exists (
        select 1 from errands e
        where e.id = applications.errand_id and e.requester_id = auth.uid()
      )
    )
  );

-- =========================================================
-- completion_proofs / reviews
-- =========================================================

alter table completion_proofs enable row level security;
drop policy if exists completion_proofs_select on completion_proofs;
create policy completion_proofs_select on completion_proofs
  for select to authenticated
  using (
    exists (
      select 1 from errands e
      where e.id = completion_proofs.errand_id
        and (e.requester_id = auth.uid() or e.runner_id = auth.uid() or is_admin())
    )
  );

alter table reviews enable row level security;
drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews
  for select to authenticated
  using (
    exists (
      select 1 from errands e
      where e.id = reviews.errand_id and e.school_id = auth_school_id()
    )
  );

-- =========================================================
-- escrows / point_transactions / urgent_purchases
-- =========================================================

alter table escrows enable row level security;
drop policy if exists escrows_select on escrows;
create policy escrows_select on escrows
  for select to authenticated
  using (payer_id = auth.uid() or payee_id = auth.uid() or is_admin());

alter table point_transactions enable row level security;
drop policy if exists point_transactions_select on point_transactions;
create policy point_transactions_select on point_transactions
  for select to authenticated
  using (user_id = auth.uid() or is_admin());

alter table urgent_purchases enable row level security;
drop policy if exists urgent_purchases_select on urgent_purchases;
create policy urgent_purchases_select on urgent_purchases
  for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- =========================================================
-- inquiries (비밀 문의 RLS)
-- =========================================================

alter table inquiries enable row level security;
drop policy if exists inquiries_select on inquiries;
create policy inquiries_select on inquiries
  for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      is_secret = false
      or author_id = auth.uid()
      or is_admin()
      or exists (
        select 1 from errands e
        where e.id = inquiries.errand_id and e.requester_id = auth.uid()
      )
    )
  );

-- =========================================================
-- chat_rooms / chat_messages
-- =========================================================

alter table chat_rooms enable row level security;
drop policy if exists chat_rooms_select on chat_rooms;
create policy chat_rooms_select on chat_rooms
  for select to authenticated
  using (requester_id = auth.uid() or partner_id = auth.uid() or is_admin());

alter table chat_messages enable row level security;
drop policy if exists chat_messages_select on chat_messages;
create policy chat_messages_select on chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from chat_rooms r
      where r.id = chat_messages.room_id
        and (r.requester_id = auth.uid() or r.partner_id = auth.uid() or is_admin())
    )
  );

-- =========================================================
-- reports / ai_moderations / ai_assists
-- =========================================================

alter table reports enable row level security;
drop policy if exists reports_select on reports;
create policy reports_select on reports
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or (is_admin() and school_id = auth_school_id())
  );

alter table ai_moderations enable row level security;
drop policy if exists ai_moderations_select on ai_moderations;
create policy ai_moderations_select on ai_moderations
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      is_admin()
      and exists (
        select 1 from users u
        where u.id = ai_moderations.user_id and u.school_id = auth_school_id()
      )
    )
  );

alter table ai_assists enable row level security;
drop policy if exists ai_assists_select on ai_assists;
create policy ai_assists_select on ai_assists
  for select to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- notifications (읽음 처리는 클라이언트에서 직접 허용)
-- =========================================================

alter table notifications enable row level security;
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================
-- route_cache (민감 정보 없는 공유 캐시)
-- =========================================================

alter table route_cache enable row level security;
drop policy if exists route_cache_select on route_cache;
create policy route_cache_select on route_cache
  for select to authenticated using (true);
