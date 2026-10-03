-- inquiries 테이블의 RLS(inquiries_select)는 비밀 문의를 제3자에게 행 자체를 숨긴다.
-- 하지만 PRD는 "제3자에게는 '비밀 문의입니다'"라고 표시하라고 요구한다(행이 있다는 사실은 보여야 함).
-- profiles 뷰와 같은 패턴으로, postgres 소유 뷰에서 RLS를 우회해 행은 항상 보여주고
-- 비밀 문의의 content만 조건부로 null 처리한다.
drop view if exists inquiries_feed;
create view inquiries_feed as
select
  i.id,
  i.school_id,
  i.errand_id,
  i.author_id,
  i.is_secret,
  case
    when i.is_secret
      and i.author_id <> auth.uid()
      and not is_admin()
      and not exists (
        select 1 from errands e where e.id = i.errand_id and e.requester_id = auth.uid()
      )
    then null
    else i.content
  end as content,
  i.answer,
  i.answered_at,
  i.moderation_status,
  i.created_at
from inquiries i
where i.school_id = auth_school_id()
  and (i.moderation_status <> 'blinded' or i.author_id = auth.uid() or is_admin());

grant select on inquiries_feed to authenticated;
