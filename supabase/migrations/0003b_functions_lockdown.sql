-- Supabase는 public 스키마에 ALTER DEFAULT PRIVILEGES로 anon/authenticated/service_role에게
-- 새 함수의 EXECUTE 권한을 자동으로 직접 부여한다(PUBLIC 의사 역할이 아니라 각 역할에 직접 부여).
-- 0003_functions.sql 적용 직후 이 때문에 내부 헬퍼(_add_points 등)와 process_deadlines()까지
-- anon/authenticated가 /rest/v1/rpc/* 로 직접 호출할 수 있는 상태였다. 아래에서 회수하고
-- 의도한 역할에만 다시 부여한 뒤, 앞으로 생성되는 함수에는 기본적으로 권한이 부여되지 않도록
-- 기본 권한 자체를 변경한다.

revoke execute on function _add_points(uuid, integer, text, uuid) from anon, authenticated;
revoke execute on function _notify(uuid, text, text, text, text) from anon, authenticated;
revoke execute on function _get_or_create_chat_room(uuid, uuid, uuid) from anon, authenticated;
revoke execute on function _system_message(uuid, text) from anon, authenticated;
revoke execute on function _confirm_completion(uuid, text) from anon, authenticated;
revoke execute on function _expire_and_refund(uuid, boolean) from anon, authenticated;
revoke execute on function process_deadlines() from anon, authenticated;

-- 회원가입은 서버(service role)에서만 수행한다. 일반 사용자가 임의의 p_user_id로
-- 호출하면 다른 사람 명의의 프로필을 만들 수 있으므로 authenticated에는 부여하지 않는다.
revoke execute on function fn_signup_profile(uuid, uuid, text, text, text, text, text, text) from anon, authenticated;
grant execute on function fn_signup_profile(uuid, uuid, text, text, text, text, text, text) to service_role;

-- 로그인하지 않은 사용자(anon)가 쓰기 RPC를 호출할 이유가 없으므로 전부 회수한다.
revoke execute on function fn_change_nickname(uuid, text) from anon;
revoke execute on function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text
) from anon;
revoke execute on function fn_apply(uuid, uuid, text) from anon;
revoke execute on function fn_select_runner(uuid, uuid, uuid) from anon;
revoke execute on function fn_report_completion(uuid, uuid, text, text) from anon;
revoke execute on function fn_confirm_completion(uuid, uuid) from anon;
revoke execute on function fn_write_review(uuid, uuid, smallint, text[], text) from anon;
revoke execute on function fn_cancel_errand(uuid, uuid, text) from anon;
revoke execute on function fn_upgrade_urgent(uuid, uuid, smallint) from anon;
revoke execute on function fn_create_inquiry(uuid, uuid, text, boolean) from anon;
revoke execute on function fn_answer_inquiry(uuid, uuid, text) from anon;
revoke execute on function fn_get_or_create_chat_room(uuid, uuid) from anon;
revoke execute on function fn_send_chat_message(uuid, uuid, text, boolean) from anon;
revoke execute on function fn_mark_room_read(uuid, uuid) from anon;
revoke execute on function fn_create_report(uuid, uuid, text, uuid, uuid, text, text, text, text) from anon;
revoke execute on function fn_admin_action(uuid, uuid, text) from anon;

-- RLS 정책 내부 헬퍼도 로그인한 사용자만 평가 대상이 되므로 anon에는 불필요하다.
revoke execute on function auth_school_id() from anon;
revoke execute on function is_admin() from anon;
revoke execute on function is_active_account() from anon;

-- pg_cron(postgres 소유)과 시드 스크립트(service role)에서 수동으로도 호출할 수 있도록 유지.
grant execute on function process_deadlines() to service_role;

-- 앞으로 새로 만드는 함수는 기본적으로 anon/authenticated에게 EXECUTE가 부여되지 않는다.
-- 외부에 노출할 함수는 매 마이그레이션 끝에서 명시적으로 grant execute ... to authenticated 해야 한다.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- 0002_rls.sql에서 만든 3개 헬퍼는 생성 시점에 PUBLIC(=X) EXECUTE가 남아 있어 anon도 호출할 수
-- 있었다. PUBLIC 권한을 회수하고 authenticated에만 다시 부여한다.
revoke execute on function auth_school_id() from public;
revoke execute on function is_admin() from public;
revoke execute on function is_active_account() from public;
grant execute on function auth_school_id() to authenticated;
grant execute on function is_admin() to authenticated;
grant execute on function is_active_account() to authenticated;

-- search_path가 고정되지 않은 SECURITY DEFINER 함수는 호출자가 search_path를 조작해
-- 내부에서 참조하는 비한정(unqualified) 테이블/함수 이름을 가로챌 수 있다. 모든 함수의
-- search_path를 public으로 고정해 이 경로를 차단한다.
alter function _add_points(uuid, integer, text, uuid) set search_path = public;
alter function _notify(uuid, text, text, text, text) set search_path = public;
alter function _get_or_create_chat_room(uuid, uuid, uuid) set search_path = public;
alter function _system_message(uuid, text) set search_path = public;
alter function _confirm_completion(uuid, text) set search_path = public;
alter function _expire_and_refund(uuid, boolean) set search_path = public;
alter function process_deadlines() set search_path = public;
alter function fn_signup_profile(uuid, uuid, text, text, text, text, text, text) set search_path = public;
alter function fn_change_nickname(uuid, text) set search_path = public;
alter function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text
) set search_path = public;
alter function fn_apply(uuid, uuid, text) set search_path = public;
alter function fn_select_runner(uuid, uuid, uuid) set search_path = public;
alter function fn_report_completion(uuid, uuid, text, text) set search_path = public;
alter function fn_confirm_completion(uuid, uuid) set search_path = public;
alter function fn_write_review(uuid, uuid, smallint, text[], text) set search_path = public;
alter function fn_cancel_errand(uuid, uuid, text) set search_path = public;
alter function fn_upgrade_urgent(uuid, uuid, smallint) set search_path = public;
alter function fn_create_inquiry(uuid, uuid, text, boolean) set search_path = public;
alter function fn_answer_inquiry(uuid, uuid, text) set search_path = public;
alter function fn_get_or_create_chat_room(uuid, uuid) set search_path = public;
alter function fn_send_chat_message(uuid, uuid, text, boolean) set search_path = public;
alter function fn_mark_room_read(uuid, uuid) set search_path = public;
alter function fn_create_report(uuid, uuid, text, uuid, uuid, text, text, text, text) set search_path = public;
alter function fn_admin_action(uuid, uuid, text) set search_path = public;
alter function auth_school_id() set search_path = public;
alter function is_admin() set search_path = public;
alter function is_active_account() set search_path = public;
