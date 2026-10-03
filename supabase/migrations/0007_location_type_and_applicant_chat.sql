-- 피드백 15: 출발/도착지를 캠퍼스 장소 목록 외에 자유 텍스트("기타")나 온라인(비대면)으로도
-- 등록할 수 있게 한다. 피드백 14: 의뢰자가 수행자를 선택하기 전에도 특정 지원자와 먼저
-- 채팅으로 소통할 수 있게 한다.

-- =========================================================
-- 1. errands.location_type
-- =========================================================

alter table errands
  add column if not exists location_type text not null default 'campus'
    check (location_type in ('campus', 'custom', 'online'));

comment on column errands.location_type is
  'campus: 캠퍼스 장소 목록에서 선택, custom: 자유 텍스트(좌표는 있을 수도 없을 수도 있음), online: 비대면(좌표 없음)';

-- =========================================================
-- 2. fn_create_errand 확장: location_type 파라미터 추가
--    (인자 개수가 바뀌면 CREATE OR REPLACE가 새 오버로드를 만들어 PostgREST가 함수를 모호하게
--     인식할 수 있으므로, 기존 시그니처를 명시적으로 드롭한 뒤 새로 만든다.)
-- =========================================================

drop function if exists fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text
);

create function fn_create_errand(
  p_requester_id uuid,
  p_title text,
  p_body text,
  p_raw_input text,
  p_category text,
  p_from_place_id uuid,
  p_from_lat numeric,
  p_from_lng numeric,
  p_from_label text,
  p_from_detail text,
  p_to_place_id uuid,
  p_to_lat numeric,
  p_to_lng numeric,
  p_to_label text,
  p_to_detail text,
  p_desired_at timestamptz,
  p_price integer,
  p_ai_suggested_price integer,
  p_urgent_level smallint,
  p_image_url text,
  p_location_type text default 'campus'
) returns errands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_status text;
  v_balance integer;
  v_urgent_fee integer := 0;
  v_errand errands;
  v_errand_id uuid := gen_random_uuid();
  v_recruit_deadline timestamptz := now() + interval '2 hours';
  v_urgent_until timestamptz;
  v_daily_count integer;
begin
  if p_location_type not in ('campus', 'custom', 'online') then
    raise exception 'INVALID_LOCATION_TYPE';
  end if;

  select school_id, status into v_school_id, v_status from users where id = p_requester_id;

  if v_school_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_status <> 'active' then
    raise exception 'USER_SUSPENDED';
  end if;

  if p_price < 1000 then
    raise exception 'PRICE_TOO_LOW';
  end if;

  if p_urgent_level > 0 then
    select count(*) into v_daily_count
    from urgent_purchases
    where user_id = p_requester_id
      and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

    if v_daily_count >= 3 then
      raise exception 'URGENT_DAILY_LIMIT';
    end if;

    v_urgent_fee := case p_urgent_level when 1 then 100 when 2 then 500 else 0 end;
    v_urgent_until := case p_urgent_level when 1 then now() + interval '30 minutes' else v_recruit_deadline end;
  end if;

  select point_balance into v_balance from users where id = p_requester_id;
  if v_balance < (p_price + v_urgent_fee) then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into errands (
    id, school_id, requester_id, title, body, raw_input, category,
    from_place_id, from_lat, from_lng, from_label, from_detail,
    to_place_id, to_lat, to_lng, to_label, to_detail,
    desired_at, price, ai_suggested_price, urgent_level, urgent_until,
    status, recruit_deadline_at, location_type
  ) values (
    v_errand_id, v_school_id, p_requester_id, p_title, p_body, p_raw_input, p_category,
    p_from_place_id, p_from_lat, p_from_lng, p_from_label, p_from_detail,
    p_to_place_id, p_to_lat, p_to_lng, p_to_label, p_to_detail,
    p_desired_at, p_price, p_ai_suggested_price, p_urgent_level, v_urgent_until,
    'RECRUITING', v_recruit_deadline, p_location_type
  )
  returning * into v_errand;

  perform _add_points(p_requester_id, -p_price, 'ESCROW_HOLD', v_errand_id);
  if v_urgent_fee > 0 then
    perform _add_points(p_requester_id, -v_urgent_fee, 'URGENT_FEE', v_errand_id);
  end if;

  insert into escrows (errand_id, payer_id, amount, status)
  values (v_errand_id, p_requester_id, p_price, 'HELD');

  if p_image_url is not null then
    insert into errand_images (errand_id, url, sort_order)
    values (v_errand_id, p_image_url, 0);
  end if;

  if v_urgent_fee > 0 then
    insert into urgent_purchases (errand_id, user_id, level, price, starts_at, ends_at)
    values (v_errand_id, p_requester_id, p_urgent_level, v_urgent_fee, now(), v_urgent_until);
  end if;

  return v_errand;
end;
$$;

revoke execute on function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text, text
) from anon;
grant execute on function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text, text
) to authenticated;

-- =========================================================
-- 3. 의뢰자가 특정 지원자와 선택 전 채팅을 여는 함수
--    (일반 지원자->의뢰자 문의는 기존 fn_get_or_create_chat_room으로 이미 가능하다.
--     의뢰자->특정 지원자 개시만 빠져 있어 이 함수로 채운다.)
-- =========================================================

create function fn_open_chat_with_applicant(
  p_errand_id uuid,
  p_requester_id uuid,
  p_applicant_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_errand errands;
  v_application applications;
  v_room_id uuid;
begin
  select * into v_errand from errands where id = p_errand_id;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_requester_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_application
  from applications
  where errand_id = p_errand_id and applicant_id = p_applicant_id and status = 'APPLIED';

  if v_application.id is null then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  v_room_id := _get_or_create_chat_room(p_errand_id, p_requester_id, p_applicant_id);
  return v_room_id;
end;
$$;

grant execute on function fn_open_chat_with_applicant(uuid, uuid, uuid) to authenticated;
