-- 온라인 의뢰 최소 500P를 허용하려면 테이블 CHECK도 함께 완화해야 한다
-- (fn_create_errand에서 위치 방식별 최소 금액을 다시 검증한다).

alter table errands drop constraint if exists errands_price_check;
alter table errands add constraint errands_price_check
  check (price >= 500 and price <= 100000);
