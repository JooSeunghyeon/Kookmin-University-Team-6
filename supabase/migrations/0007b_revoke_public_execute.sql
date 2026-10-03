-- 0007에서 새로 만든 함수 2개는 default privileges 템플릿이 적용되지 않아
-- (기존 함수들과 달리) PUBLIC에 암묵적으로 EXECUTE가 부여된 채로 생성되었다.
-- anon도 PUBLIC을 통해 호출할 수 있었던 문제를 막기 위해 명시적으로 회수한다.

revoke execute on function fn_create_errand(
  uuid, text, text, text, text, uuid, numeric, numeric, text, text,
  uuid, numeric, numeric, text, text, timestamptz, integer, integer, smallint, text, text
) from public;

revoke execute on function fn_open_chat_with_applicant(uuid, uuid, uuid) from public;
