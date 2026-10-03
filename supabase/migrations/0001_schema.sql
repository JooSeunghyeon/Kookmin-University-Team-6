-- 캠퍼스런 13장 테이블 정의서 그대로 구현 (19개 테이블)
-- 공통 규칙: uuid PK(gen_random_uuid()), timestamptz, integer 원 단위, CHECK 상태코드, created_at default now()

create extension if not exists pgcrypto;

-- =========================================================
-- 13-1. 회원 · 학교
-- =========================================================

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text not null unique,
  center_lat numeric(9,6) not null,
  center_lng numeric(9,6) not null,
  bounds jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references schools (id),
  email text not null unique,
  real_name_enc text not null,
  student_no_enc text not null,
  student_no_hash text not null,
  department text,
  nickname text not null,
  nickname_changed_at timestamptz not null default now(),
  profile_image_url text,
  campus_temp numeric(4,1) not null default 36.5,
  point_balance integer not null default 0 check (point_balance >= 0),
  completed_count integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'restricted', 'suspended', 'banned')),
  restricted_until timestamptz,
  role text not null default 'user' check (role in ('user', 'admin')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, student_no_hash),
  unique (school_id, nickname)
);

create table if not exists campus_places (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  name text not null,
  category text not null
    check (category in ('building', 'cafeteria', 'store', 'gate', 'dorm', 'etc')),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 13-2. 의뢰 · 매칭 · 진행
-- =========================================================

create table if not exists errands (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  requester_id uuid not null references users (id),
  title text not null,
  body text not null,
  raw_input text,
  category text not null
    check (category in ('meal', 'print', 'parcel', 'pickup', 'moving', 'etc')),
  from_place_id uuid references campus_places (id),
  from_lat numeric(9,6),
  from_lng numeric(9,6),
  from_label text,
  from_detail text,
  to_place_id uuid references campus_places (id),
  to_lat numeric(9,6),
  to_lng numeric(9,6),
  to_label text,
  to_detail text,
  desired_at timestamptz not null,
  price integer not null check (price >= 1000),
  ai_suggested_price integer,
  urgent_level smallint not null default 0 check (urgent_level in (0, 1, 2)),
  urgent_until timestamptz,
  status text not null default 'RECRUITING'
    check (status in (
      'RECRUITING', 'SELECTING', 'MATCHED', 'CONFIRMING',
      'COMPLETED', 'EXPIRED', 'CANCELLED', 'DISPUTED'
    )),
  recruit_deadline_at timestamptz not null,
  select_deadline_at timestamptz,
  confirm_deadline_at timestamptz,
  runner_id uuid references users (id),
  selected_application_id uuid,
  confirm_method text check (confirm_method in ('photo', 'review', 'auto')),
  moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'warned', 'blinded')),
  applicant_count integer not null default 0,
  view_count integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_errands_school_status_created
  on errands (school_id, status, created_at desc);
create index if not exists idx_errands_recruit_deadline
  on errands (status, recruit_deadline_at);
create index if not exists idx_errands_select_deadline
  on errands (status, select_deadline_at);
create index if not exists idx_errands_confirm_deadline
  on errands (status, confirm_deadline_at);

create table if not exists errand_images (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null references errands (id) on delete cascade,
  url text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  errand_id uuid not null references errands (id) on delete cascade,
  applicant_id uuid not null references users (id),
  message text not null default '',
  status text not null default 'APPLIED'
    check (status in ('APPLIED', 'SELECTED', 'NOT_SELECTED', 'WITHDRAWN')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (errand_id, applicant_id)
);

alter table errands
  add constraint errands_selected_application_fk
  foreign key (selected_application_id) references applications (id);

create table if not exists completion_proofs (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null references errands (id) on delete cascade,
  runner_id uuid not null references users (id),
  photo_url text,
  memo text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null references errands (id) on delete cascade,
  reviewer_id uuid not null references users (id),
  reviewee_id uuid not null references users (id),
  rating smallint not null check (rating between 1 and 5),
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  unique (errand_id, reviewer_id)
);

-- =========================================================
-- 13-3. 결제 · 포인트
-- =========================================================

create table if not exists escrows (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null unique references errands (id) on delete cascade,
  payer_id uuid not null references users (id),
  payee_id uuid references users (id),
  amount integer not null,
  fee_rate numeric(4,3) not null default 0.100,
  fee_amount integer,
  status text not null default 'HELD'
    check (status in ('HELD', 'RELEASED', 'REFUNDED', 'ON_HOLD')),
  payout_method text default 'point',
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  errand_id uuid references errands (id),
  type text not null check (type in (
    'CHARGE', 'ESCROW_HOLD', 'PAYOUT', 'REFUND', 'FEE',
    'URGENT_FEE', 'URGENT_REFUND', 'WITHDRAW'
  )),
  amount integer not null,
  balance_after integer,
  pg_payment_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_point_transactions_user
  on point_transactions (user_id, created_at desc);

create table if not exists urgent_purchases (
  id uuid primary key default gen_random_uuid(),
  errand_id uuid not null references errands (id) on delete cascade,
  user_id uuid not null references users (id),
  level smallint not null check (level in (1, 2)),
  price integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  refunded_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_urgent_purchases_user_created
  on urgent_purchases (user_id, created_at desc);

-- =========================================================
-- 13-4. 소통 · 안전 · AI · 기타
-- =========================================================

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  errand_id uuid not null references errands (id) on delete cascade,
  author_id uuid not null references users (id),
  content text not null,
  is_secret boolean not null default false,
  answer text,
  answered_at timestamptz,
  moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'warned', 'blinded')),
  created_at timestamptz not null default now()
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  errand_id uuid not null references errands (id) on delete cascade,
  requester_id uuid not null references users (id),
  partner_id uuid not null references users (id),
  last_message text,
  last_message_at timestamptz,
  requester_unread integer not null default 0,
  partner_unread integer not null default 0,
  left_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (errand_id, partner_id)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms (id) on delete cascade,
  sender_id uuid references users (id),
  type text not null default 'text' check (type in ('text', 'image', 'system')),
  content text not null,
  image_url text,
  is_masked boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room_created
  on chat_messages (room_id, created_at);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id),
  reporter_id uuid not null references users (id),
  target_type text not null
    check (target_type in ('errand', 'user', 'chat_message', 'inquiry', 'review')),
  target_id uuid not null,
  target_user_id uuid not null references users (id),
  reason text not null
    check (reason in ('ACADEMIC', 'SEXUAL', 'ABUSE', 'ILLEGAL', 'SCAM', 'NO_SHOW', 'ETC')),
  detail text,
  ai_category text,
  ai_severity text check (ai_severity in ('high', 'medium', 'low')),
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'REVIEWING', 'ACTIONED', 'DISMISSED')),
  handled_by uuid references users (id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_target
  on reports (target_type, target_id);

create table if not exists ai_moderations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  target_type text not null
    check (target_type in ('errand', 'application', 'inquiry', 'chat_message', 'nickname', 'review')),
  target_id uuid,
  detected_lang text not null default 'ko',
  verdict text not null check (verdict in ('PASS', 'WARN', 'BLOCK', 'BLIND')),
  categories text[] not null default '{}',
  reason text not null default '',
  original_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_assists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  errand_id uuid references errands (id),
  raw_input text not null,
  result jsonb not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists route_cache (
  id uuid primary key default gen_random_uuid(),
  from_key text not null,
  to_key text not null,
  distance_m integer not null,
  duration_sec integer not null,
  path jsonb,
  source text not null default 'straight' check (source in ('tmap', 'straight')),
  created_at timestamptz not null default now(),
  unique (from_key, to_key)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  type text not null check (type in (
    'APPLIED', 'SELECTED', 'NOT_SELECTED', 'DEADLINE_SOON', 'INQUIRY',
    'ANSWER', 'CHAT', 'COMPLETED_REPORT', 'PAID', 'EXPIRED', 'REPORT_RESULT'
  )),
  title text not null,
  body text not null default '',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on notifications (user_id, created_at desc);
