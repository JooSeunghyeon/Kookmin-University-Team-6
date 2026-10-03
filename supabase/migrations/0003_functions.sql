-- 캠퍼스런 DB 함수: 포인트·에스크로·상태 전이는 전부 이 안에서 트랜잭션으로 처리한다.
-- 모든 함수는 security definer(테이블 소유자 postgres)로 실행되어 RLS를 우회하며,
-- authenticated 역할에 EXECUTE 권한만 부여한다 (클라이언트는 테이블 직접 쓰기 불가).

set search_path = public;

-- =========================================================
-- 0. 내부 공용 헬퍼
-- =========================================================

create or replace function _add_points(
  p_user_id uuid,
  p_delta integer,
  p_type text,
  p_errand_id uuid default null
) returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  update users
  set point_balance = point_balance + p_delta
  where id = p_user_id
  returning point_balance into v_balance;

  if v_balance is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into point_transactions (user_id, errand_id, type, amount, balance_after)
  values (p_user_id, p_errand_id, p_type, p_delta, v_balance);

  return v_balance;
end;
$$;

create or replace function _notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text default null
) returns void
language plpgsql
security definer
as $$
begin
  insert into notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

create or replace function _get_or_create_chat_room(
  p_errand_id uuid,
  p_requester_id uuid,
  p_partner_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_room_id uuid;
  v_school_id uuid;
begin
  select id into v_room_id
  from chat_rooms
  where errand_id = p_errand_id and partner_id = p_partner_id;

  if v_room_id is not null then
    return v_room_id;
  end if;

  select school_id into v_school_id from errands where id = p_errand_id;

  insert into chat_rooms (school_id, errand_id, requester_id, partner_id)
  values (v_school_id, p_errand_id, p_requester_id, p_partner_id)
  returning id into v_room_id;

  return v_room_id;
end;
$$;

create or replace function _system_message(
  p_room_id uuid,
  p_content text
) returns void
language plpgsql
security definer
as $$
begin
  insert into chat_messages (room_id, sender_id, type, content)
  values (p_room_id, null, 'system', p_content);

  update chat_rooms
  set last_message = p_content, last_message_at = now()
  where id = p_room_id;
end;
$$;

-- 완료 확인(지급) 핵심 로직: 수동 확인/후기 확인/자동 확인이 공유한다.
create or replace function _confirm_completion(
  p_errand_id uuid,
  p_method text
) returns errands
language plpgsql
security definer
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

  v_payout := floor(v_errand.price * 0.9);
  v_fee := v_errand.price - v_payout;

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

-- 만료 환불 핵심 로직: 모집 0명 만료 / 선택 기한 초과 만료가 공유한다.
create or replace function _expire_and_refund(
  p_errand_id uuid,
  p_refund_urgent boolean
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_urgent_refund integer := 0;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  perform _add_points(v_errand.requester_id, v_errand.price, 'REFUND', p_errand_id);

  update escrows
  set status = 'REFUNDED', refunded_at = now()
  where errand_id = p_errand_id;

  if p_refund_urgent and v_errand.urgent_level > 0 then
    select price into v_urgent_refund from urgent_purchases
    where errand_id = p_errand_id
    order by created_at desc limit 1;

    if v_urgent_refund is not null then
      v_urgent_refund := floor(v_urgent_refund * 0.5);
      perform _add_points(v_errand.requester_id, v_urgent_refund, 'URGENT_REFUND', p_errand_id);
      update urgent_purchases
      set refunded_amount = v_urgent_refund
      where errand_id = p_errand_id;
    end if;
  end if;

  update applications
  set status = 'NOT_SELECTED', decided_at = now()
  where errand_id = p_errand_id and status = 'APPLIED';

  update errands
  set status = 'EXPIRED'
  where id = p_errand_id
  returning * into v_errand;

  perform _notify(
    v_errand.requester_id, 'EXPIRED', '의뢰가 만료되어 환불되었어요',
    format('%s P가 환불되었습니다.', v_errand.price), format('/errands/%s', p_errand_id)
  );

  insert into notifications (user_id, type, title, body, link)
  select applicant_id, 'NOT_SELECTED', '의뢰가 만료되었어요', '모집 중이던 의뢰가 만료되었습니다.',
         format('/errands/%s', p_errand_id)
  from applications
  where errand_id = p_errand_id;

  return v_errand;
end;
$$;

-- =========================================================
-- 1. 회원가입
-- =========================================================

create or replace function fn_signup_profile(
  p_user_id uuid,
  p_school_id uuid,
  p_email text,
  p_real_name_enc text,
  p_student_no_enc text,
  p_student_no_hash text,
  p_department text,
  p_nickname text
) returns users
language plpgsql
security definer
as $$
declare
  v_user users;
begin
  insert into users (
    id, school_id, email, real_name_enc, student_no_enc, student_no_hash,
    department, nickname, point_balance, campus_temp
  ) values (
    p_user_id, p_school_id, p_email, p_real_name_enc, p_student_no_enc, p_student_no_hash,
    p_department, p_nickname, 0, 36.5
  )
  returning * into v_user;

  perform _add_points(p_user_id, 10000, 'CHARGE', null);

  select * into v_user from users where id = p_user_id;
  return v_user;
end;
$$;

-- =========================================================
-- 2. 닉네임 변경 (30일 1회)
-- =========================================================

create or replace function fn_change_nickname(
  p_user_id uuid,
  p_new_nickname text
) returns users
language plpgsql
security definer
as $$
declare
  v_user users;
begin
  select * into v_user from users where id = p_user_id for update;

  if v_user.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_user.nickname_changed_at > now() - interval '30 days' then
    raise exception 'NICKNAME_COOLDOWN';
  end if;

  update users
  set nickname = p_new_nickname, nickname_changed_at = now()
  where id = p_user_id
  returning * into v_user;

  return v_user;
end;
$$;

-- =========================================================
-- 3. 의뢰 작성 (에스크로 보관 + 긴급 옵션)
-- =========================================================

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
  p_image_url text
) returns errands
language plpgsql
security definer
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
    status, recruit_deadline_at
  ) values (
    v_errand_id, v_school_id, p_requester_id, p_title, p_body, p_raw_input, p_category,
    p_from_place_id, p_from_lat, p_from_lng, p_from_label, p_from_detail,
    p_to_place_id, p_to_lat, p_to_lng, p_to_label, p_to_detail,
    p_desired_at, p_price, p_ai_suggested_price, p_urgent_level, v_urgent_until,
    'RECRUITING', v_recruit_deadline
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

-- =========================================================
-- 4. 지원하기 / 모집 마감 지원 차단
-- =========================================================

create or replace function fn_apply(
  p_errand_id uuid,
  p_applicant_id uuid,
  p_message text
) returns applications
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_app applications;
  v_status text;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.status <> 'RECRUITING' or now() >= v_errand.recruit_deadline_at then
    raise exception 'RECRUIT_CLOSED';
  end if;

  if v_errand.requester_id = p_applicant_id then
    raise exception 'CANNOT_APPLY_OWN';
  end if;

  select status into v_status from users where id = p_applicant_id;
  if v_status <> 'active' then
    raise exception 'USER_SUSPENDED';
  end if;

  insert into applications (school_id, errand_id, applicant_id, message)
  values (v_errand.school_id, p_errand_id, p_applicant_id, coalesce(p_message, ''))
  returning * into v_app;

  update errands set applicant_count = applicant_count + 1 where id = p_errand_id;

  perform _notify(
    v_errand.requester_id, 'APPLIED', '새 지원자가 있어요',
    '의뢰에 새로운 지원자가 도착했습니다.', format('/errands/%s', p_errand_id)
  );

  return v_app;
end;
$$;

-- =========================================================
-- 5. 수행자 선택 (조기 선택 포함)
-- =========================================================

create or replace function fn_select_runner(
  p_errand_id uuid,
  p_application_id uuid,
  p_actor_id uuid
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_app applications;
  v_room_id uuid;
  v_other_applicant_ids uuid[];
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_actor_id then
    raise exception 'NOT_REQUESTER';
  end if;

  if v_errand.status not in ('RECRUITING', 'SELECTING') then
    raise exception 'NOT_SELECTABLE';
  end if;

  select * into v_app from applications
  where id = p_application_id and errand_id = p_errand_id and status = 'APPLIED';

  if v_app.id is null then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  select coalesce(array_agg(applicant_id), '{}') into v_other_applicant_ids
  from applications
  where errand_id = p_errand_id and id <> p_application_id and status = 'APPLIED';

  update applications set status = 'SELECTED', decided_at = now() where id = p_application_id;

  update applications set status = 'NOT_SELECTED', decided_at = now()
  where errand_id = p_errand_id and id <> p_application_id and status = 'APPLIED';

  insert into notifications (user_id, type, title, body, link)
  select unnest(v_other_applicant_ids), 'NOT_SELECTED', '다른 분이 선택되었어요',
         '아쉽지만 이번 의뢰는 다른 지원자가 선택되었습니다.', format('/errands/%s', p_errand_id);

  update errands
  set status = 'MATCHED', runner_id = v_app.applicant_id,
      selected_application_id = p_application_id, select_deadline_at = null
  where id = p_errand_id
  returning * into v_errand;

  update escrows set payee_id = v_app.applicant_id where errand_id = p_errand_id;

  v_room_id := _get_or_create_chat_room(p_errand_id, v_errand.requester_id, v_app.applicant_id);
  perform _system_message(v_room_id, '수행자로 선택되었어요');

  perform _notify(
    v_app.applicant_id, 'SELECTED', '수행자로 선택되었어요',
    '채팅방에서 세부 내용을 조율해 주세요.', format('/chat/%s', v_room_id)
  );

  return v_errand;
end;
$$;

-- =========================================================
-- 6. 완료 보고 / 완료 확인 / 후기
-- =========================================================

create or replace function fn_report_completion(
  p_errand_id uuid,
  p_runner_id uuid,
  p_photo_url text,
  p_memo text
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_room_id uuid;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.runner_id <> p_runner_id or v_errand.status <> 'MATCHED' then
    raise exception 'NOT_IN_PROGRESS';
  end if;

  insert into completion_proofs (errand_id, runner_id, photo_url, memo)
  values (p_errand_id, p_runner_id, p_photo_url, p_memo);

  update errands
  set status = 'CONFIRMING', confirm_deadline_at = now() + interval '24 hours'
  where id = p_errand_id
  returning * into v_errand;

  select id into v_room_id from chat_rooms
  where errand_id = p_errand_id and partner_id = p_runner_id;

  if v_room_id is not null then
    perform _system_message(v_room_id, '완료 보고가 도착했어요');
  end if;

  perform _notify(
    v_errand.requester_id, 'COMPLETED_REPORT', '완료 보고가 도착했어요',
    '인증 사진을 확인하고 완료를 확정해 주세요.', format('/errands/%s', p_errand_id)
  );

  return v_errand;
end;
$$;

create or replace function fn_confirm_completion(
  p_errand_id uuid,
  p_actor_id uuid
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
begin
  select * into v_errand from errands where id = p_errand_id;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_actor_id then
    raise exception 'NOT_REQUESTER';
  end if;

  return _confirm_completion(p_errand_id, 'photo');
end;
$$;

create or replace function fn_write_review(
  p_errand_id uuid,
  p_reviewer_id uuid,
  p_rating smallint,
  p_tags text[],
  p_comment text
) returns reviews
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_review reviews;
  v_delta numeric;
begin
  select * into v_errand from errands where id = p_errand_id;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_reviewer_id then
    raise exception 'NOT_REQUESTER';
  end if;

  if v_errand.status not in ('CONFIRMING', 'COMPLETED') then
    raise exception 'NOT_REVIEWABLE';
  end if;

  if v_errand.status = 'CONFIRMING' then
    perform _confirm_completion(p_errand_id, 'review');
  end if;

  insert into reviews (errand_id, reviewer_id, reviewee_id, rating, tags, comment)
  values (p_errand_id, p_reviewer_id, v_errand.runner_id, p_rating, coalesce(p_tags, '{}'), p_comment)
  returning * into v_review;

  v_delta := case p_rating
    when 5 then 0.5 when 4 then 0.3 when 3 then 0.1
    when 2 then -0.3 when 1 then -0.5 else 0
  end;

  update users
  set campus_temp = round(campus_temp + v_delta, 1)
  where id = v_errand.runner_id;

  return v_review;
end;
$$;

-- =========================================================
-- 7. 의뢰 취소 (모집·선택 단계)
-- =========================================================

create or replace function fn_cancel_errand(
  p_errand_id uuid,
  p_actor_id uuid,
  p_reason text
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_actor_id then
    raise exception 'NOT_REQUESTER';
  end if;

  if v_errand.status not in ('RECRUITING', 'SELECTING') then
    raise exception 'NOT_CANCELLABLE';
  end if;

  perform _add_points(v_errand.requester_id, v_errand.price, 'REFUND', p_errand_id);

  update escrows set status = 'REFUNDED', refunded_at = now() where errand_id = p_errand_id;

  update applications set status = 'NOT_SELECTED', decided_at = now()
  where errand_id = p_errand_id and status = 'APPLIED';

  update errands set status = 'CANCELLED' where id = p_errand_id returning * into v_errand;

  return v_errand;
end;
$$;

-- =========================================================
-- 8. 긴급 전환 (모집 중)
-- =========================================================

create or replace function fn_upgrade_urgent(
  p_errand_id uuid,
  p_actor_id uuid,
  p_level smallint
) returns errands
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_fee integer;
  v_until timestamptz;
  v_daily_count integer;
  v_balance integer;
begin
  select * into v_errand from errands where id = p_errand_id for update;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id <> p_actor_id then
    raise exception 'NOT_REQUESTER';
  end if;

  if v_errand.status <> 'RECRUITING' then
    raise exception 'NOT_UPGRADABLE';
  end if;

  if v_errand.moderation_status <> 'visible' then
    raise exception 'MODERATION_BLOCKED';
  end if;

  select count(*) into v_daily_count
  from urgent_purchases
  where user_id = p_actor_id
    and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

  if v_daily_count >= 3 then
    raise exception 'URGENT_DAILY_LIMIT';
  end if;

  v_fee := case p_level when 1 then 100 when 2 then 500 else 0 end;
  v_until := case p_level when 1 then now() + interval '30 minutes' else v_errand.recruit_deadline_at end;

  select point_balance into v_balance from users where id = p_actor_id;
  if v_balance < v_fee then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  perform _add_points(p_actor_id, -v_fee, 'URGENT_FEE', p_errand_id);

  insert into urgent_purchases (errand_id, user_id, level, price, starts_at, ends_at)
  values (p_errand_id, p_actor_id, p_level, v_fee, now(), v_until);

  update errands set urgent_level = p_level, urgent_until = v_until
  where id = p_errand_id
  returning * into v_errand;

  return v_errand;
end;
$$;

-- =========================================================
-- 9. 문의 작성 / 답변
-- =========================================================

create or replace function fn_create_inquiry(
  p_errand_id uuid,
  p_author_id uuid,
  p_content text,
  p_is_secret boolean
) returns inquiries
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_inquiry inquiries;
begin
  select * into v_errand from errands where id = p_errand_id;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id = p_author_id then
    raise exception 'CANNOT_INQUIRE_OWN';
  end if;

  if v_errand.status <> 'RECRUITING' or now() >= v_errand.recruit_deadline_at then
    raise exception 'INQUIRY_CLOSED';
  end if;

  insert into inquiries (school_id, errand_id, author_id, content, is_secret)
  values (v_errand.school_id, p_errand_id, p_author_id, p_content, coalesce(p_is_secret, false))
  returning * into v_inquiry;

  perform _notify(
    v_errand.requester_id, 'INQUIRY', '새 문의가 도착했어요',
    p_content, format('/errands/%s', p_errand_id)
  );

  return v_inquiry;
end;
$$;

create or replace function fn_answer_inquiry(
  p_inquiry_id uuid,
  p_actor_id uuid,
  p_answer text
) returns inquiries
language plpgsql
security definer
as $$
declare
  v_inquiry inquiries;
  v_requester_id uuid;
begin
  select * into v_inquiry from inquiries where id = p_inquiry_id;

  if v_inquiry.id is null then
    raise exception 'INQUIRY_NOT_FOUND';
  end if;

  select requester_id into v_requester_id from errands where id = v_inquiry.errand_id;

  if v_requester_id <> p_actor_id then
    raise exception 'NOT_REQUESTER';
  end if;

  if v_inquiry.answer is not null then
    raise exception 'ALREADY_ANSWERED';
  end if;

  update inquiries set answer = p_answer, answered_at = now()
  where id = p_inquiry_id
  returning * into v_inquiry;

  perform _notify(
    v_inquiry.author_id, 'ANSWER', '문의에 답변이 달렸어요',
    p_answer, format('/errands/%s', v_inquiry.errand_id)
  );

  return v_inquiry;
end;
$$;

-- =========================================================
-- 10. 채팅
-- =========================================================

create or replace function fn_get_or_create_chat_room(
  p_errand_id uuid,
  p_actor_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_errand errands;
  v_room_id uuid;
begin
  select * into v_errand from errands where id = p_errand_id;

  if v_errand.id is null then
    raise exception 'ERRAND_NOT_FOUND';
  end if;

  if v_errand.requester_id = p_actor_id then
    raise exception 'USE_PARTNER_FLOW';
  end if;

  v_room_id := _get_or_create_chat_room(p_errand_id, v_errand.requester_id, p_actor_id);
  return v_room_id;
end;
$$;

create or replace function fn_send_chat_message(
  p_room_id uuid,
  p_sender_id uuid,
  p_content text,
  p_is_masked boolean
) returns chat_messages
language plpgsql
security definer
as $$
declare
  v_room chat_rooms;
  v_message chat_messages;
  v_recipient uuid;
begin
  select * into v_room from chat_rooms where id = p_room_id for update;

  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if p_sender_id not in (v_room.requester_id, v_room.partner_id) then
    raise exception 'NOT_PARTICIPANT';
  end if;

  insert into chat_messages (room_id, sender_id, type, content, is_masked)
  values (p_room_id, p_sender_id, 'text', p_content, coalesce(p_is_masked, false))
  returning * into v_message;

  if p_sender_id = v_room.requester_id then
    v_recipient := v_room.partner_id;
    update chat_rooms
    set last_message = p_content, last_message_at = now(),
        partner_unread = partner_unread + 1
    where id = p_room_id;
  else
    v_recipient := v_room.requester_id;
    update chat_rooms
    set last_message = p_content, last_message_at = now(),
        requester_unread = requester_unread + 1
    where id = p_room_id;
  end if;

  perform _notify(v_recipient, 'CHAT', '새 메시지가 있어요', p_content, format('/chat/%s', p_room_id));

  return v_message;
end;
$$;

create or replace function fn_mark_room_read(
  p_room_id uuid,
  p_actor_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_room chat_rooms;
begin
  select * into v_room from chat_rooms where id = p_room_id;

  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if p_actor_id = v_room.requester_id then
    update chat_rooms set requester_unread = 0 where id = p_room_id;
  elsif p_actor_id = v_room.partner_id then
    update chat_rooms set partner_unread = 0 where id = p_room_id;
  else
    raise exception 'NOT_PARTICIPANT';
  end if;

  update chat_messages
  set read_at = now()
  where room_id = p_room_id and sender_id is distinct from p_actor_id and read_at is null;
end;
$$;

-- =========================================================
-- 11. 신고 / 관리자 조치
-- =========================================================

create or replace function fn_create_report(
  p_school_id uuid,
  p_reporter_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_reason text,
  p_detail text,
  p_ai_category text,
  p_ai_severity text
) returns reports
language plpgsql
security definer
as $$
declare
  v_report reports;
  v_distinct_reporters integer;
  v_should_blind boolean := false;
begin
  insert into reports (
    school_id, reporter_id, target_type, target_id, target_user_id,
    reason, detail, ai_category, ai_severity
  ) values (
    p_school_id, p_reporter_id, p_target_type, p_target_id, p_target_user_id,
    p_reason, p_detail, p_ai_category, p_ai_severity
  )
  returning * into v_report;

  select count(distinct reporter_id) into v_distinct_reporters
  from reports
  where target_type = p_target_type and target_id = p_target_id;

  if p_ai_severity = 'high' or v_distinct_reporters >= 3 then
    v_should_blind := true;
  end if;

  if v_should_blind then
    if p_target_type = 'errand' then
      update errands set moderation_status = 'blinded' where id = p_target_id;
    elsif p_target_type = 'inquiry' then
      update inquiries set moderation_status = 'blinded' where id = p_target_id;
    end if;
  end if;

  return v_report;
end;
$$;

create or replace function fn_admin_action(
  p_admin_id uuid,
  p_report_id uuid,
  p_action text
) returns reports
language plpgsql
security definer
as $$
declare
  v_admin_role text;
  v_report reports;
begin
  select role into v_admin_role from users where id = p_admin_id;
  if v_admin_role <> 'admin' then
    raise exception 'NOT_ADMIN';
  end if;

  select * into v_report from reports where id = p_report_id for update;
  if v_report.id is null then
    raise exception 'REPORT_NOT_FOUND';
  end if;

  if p_action = 'unblind' then
    if v_report.target_type = 'errand' then
      update errands set moderation_status = 'visible' where id = v_report.target_id;
    elsif v_report.target_type = 'inquiry' then
      update inquiries set moderation_status = 'visible' where id = v_report.target_id;
    end if;
  elsif p_action = 'suspend_user' then
    update users set status = 'suspended' where id = v_report.target_user_id;
    perform _notify(
      v_report.target_user_id, 'REPORT_RESULT', '이용이 제한되었어요',
      '신고 처리 결과 계정이 정지되었습니다.', null
    );
  elsif p_action <> 'keep_blind' then
    raise exception 'UNKNOWN_ACTION';
  end if;

  update reports
  set status = 'ACTIONED', handled_by = p_admin_id, handled_at = now()
  where id = p_report_id
  returning * into v_report;

  perform _notify(
    v_report.reporter_id, 'REPORT_RESULT', '신고가 처리되었어요',
    '신고해 주신 내용이 처리되었습니다.', null
  );

  return v_report;
end;
$$;

-- =========================================================
-- 12. pg_cron 스케줄러: 1분마다 마감 시각을 직접 비교해 상태를 전이한다.
-- =========================================================

create or replace function process_deadlines() returns void
language plpgsql
security definer
as $$
declare
  r record;
begin
  -- 모집 마감 처리: 지원자 0명이면 즉시 만료, 1명 이상이면 선택 단계로.
  for r in
    select id, applicant_count from errands
    where status = 'RECRUITING' and recruit_deadline_at <= now()
    for update skip locked
  loop
    if r.applicant_count = 0 then
      perform _expire_and_refund(r.id, true);
    else
      update errands
      set status = 'SELECTING', select_deadline_at = recruit_deadline_at + interval '3 hours'
      where id = r.id;
    end if;
  end loop;

  -- 선택 기한 초과: 전액 환불 후 만료.
  for r in
    select id from errands
    where status = 'SELECTING' and select_deadline_at <= now()
    for update skip locked
  loop
    perform _expire_and_refund(r.id, false);
  end loop;

  -- 완료 보고 후 24시간 무응답: 자동 확인 처리.
  for r in
    select id from errands
    where status = 'CONFIRMING' and confirm_deadline_at <= now()
    for update skip locked
  loop
    perform _confirm_completion(r.id, 'auto');
  end loop;
end;
$$;

-- =========================================================
-- 권한 부여: authenticated 역할은 아래 RPC만 호출할 수 있다.
-- =========================================================

grant execute on function fn_signup_profile(uuid, uuid, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function fn_change_nickname(uuid, text) to authenticated;
grant execute on function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text
) to authenticated;
grant execute on function fn_apply(uuid, uuid, text) to authenticated;
grant execute on function fn_select_runner(uuid, uuid, uuid) to authenticated;
grant execute on function fn_report_completion(uuid, uuid, text, text) to authenticated;
grant execute on function fn_confirm_completion(uuid, uuid) to authenticated;
grant execute on function fn_write_review(uuid, uuid, smallint, text[], text) to authenticated;
grant execute on function fn_cancel_errand(uuid, uuid, text) to authenticated;
grant execute on function fn_upgrade_urgent(uuid, uuid, smallint) to authenticated;
grant execute on function fn_create_inquiry(uuid, uuid, text, boolean) to authenticated;
grant execute on function fn_answer_inquiry(uuid, uuid, text) to authenticated;
grant execute on function fn_get_or_create_chat_room(uuid, uuid) to authenticated;
grant execute on function fn_send_chat_message(uuid, uuid, text, boolean) to authenticated;
grant execute on function fn_mark_room_read(uuid, uuid) to authenticated;
grant execute on function fn_create_report(uuid, uuid, text, uuid, uuid, text, text, text, text) to authenticated;
grant execute on function fn_admin_action(uuid, uuid, text) to authenticated;
