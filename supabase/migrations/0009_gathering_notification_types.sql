-- Stage G 전수 테스트 중 발견한 버그: fn_join_gathering/fn_add_gathering_comment가
-- notifications.type에 'GATHERING_JOIN'/'GATHERING_COMMENT'를 넣으려 하지만
-- notifications_type_check에 이 값들이 없어 500 에러가 났다(참여/댓글 자체가 실패).

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'APPLIED', 'SELECTED', 'NOT_SELECTED', 'DEADLINE_SOON', 'INQUIRY', 'ANSWER',
    'CHAT', 'COMPLETED_REPORT', 'PAID', 'EXPIRED', 'REPORT_RESULT',
    'GATHERING_JOIN', 'GATHERING_COMMENT'
  ));
