-- 피드백 반영
-- 1) 온라인(비대면) 의뢰는 최소 사례금 500P, 그 외는 1,000P.
-- 2) 플랫폼 수수료는 10%지만 1,000P에서 상한을 둔다(예: 10,000P 의뢰 → 수수료 1,000P).
-- 3) 사례금 상한 100,000P.

create or replace function _platform_fee(p_price integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select least(floor(p_price * 0.1)::integer, 1000);
$$;

create or replace function fn_create_errand(
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
  v_min_price integer;
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

  v_min_price := case when p_location_type = 'online' then 500 else 1000 end;

  if p_price < v_min_price then
    raise exception 'PRICE_TOO_LOW';
  end if;

  if p_price > 100000 then
    raise exception 'PRICE_TOO_HIGH';
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

  insert into escrows (errand_id, payer_id, amount, fee_amount, status)
  values (v_errand_id, p_requester_id, p_price, _platform_fee(p_price), 'HELD');

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

create or replace function _confirm_completion(
  p_errand_id uuid,
  p_method text
) returns errands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_errand errands;
  v_payout integer;
  v_fee integer;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.status <> 'CONFIRMING' then
    raise exception 'NOT_CONFIRMING';
  end if;

  v_fee := _platform_fee(v_errand.price);
  v_payout := v_errand.price - v_fee;

  perform _add_points(v_errand.runner_id, v_payout, 'PAYOUT', p_errand_id);

  insert into point_transactions (user_id, errand_id, type, amount, balance_after)
  values (null, p_errand_id, 'FEE', -v_fee, null);

  update escrows
  set status = 'RELEASED', fee_amount = v_fee, released_at = now()
  where errand_id = p_errand_id;

  update users
  set completed_count = completed_count + 1
  where id = v_errand.runner_id;

  update errands
  set status = 'COMPLETED', confirm_method = p_method, completed_at = now()
  where id = p_errand_id
  returning * into v_errand;

  perform _notify(
    v_errand.runner_id, 'PAID', '포인트가 지급되었어요',
    format('%s P가 지급되었습니다.', v_payout), format('/errands/%s', p_errand_id)
  );

  return v_errand;
end;
$$;
