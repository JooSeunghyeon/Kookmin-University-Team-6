-- ai_assists / ai_moderations는 0002_rls.sql에서 SELECT 정책만 만들었다.
-- 4단계(ai)에서 두 테이블에 "내가 요청한 기록만" 직접 INSERT하는 기능이 필요한데,
-- RLS가 켜진 테이블은 명시적 정책이 없으면 기본적으로 모든 쓰기를 거부한다.
-- 포인트·상태를 바꾸지 않는 순수 로그 테이블이므로 SECURITY DEFINER 함수 없이
-- "본인 행만" INSERT를 직접 허용한다. 호출하는 Route Handler는 이미
-- requireApiUser()로 세션을 확인하므로 user_id는 auth.uid()와 항상 일치한다.

drop policy if exists ai_assists_insert_own on ai_assists;
create policy ai_assists_insert_own on ai_assists
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_moderations_insert_own on ai_moderations;
create policy ai_moderations_insert_own on ai_moderations
  for insert to authenticated
  with check (user_id = auth.uid());
