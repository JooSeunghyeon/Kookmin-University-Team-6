-- pg_cron: 1분마다 모집 마감/선택 마감/완료 확인 마감을 처리한다.
create extension if not exists pg_cron;

select cron.schedule(
  'process_deadlines_sweep',
  '* * * * *',
  $$select process_deadlines();$$
);

-- Realtime: 채팅·알림·의뢰 상태 변화를 클라이언트가 구독할 수 있도록 발행한다.
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table errands;

-- Storage: 의뢰 첨부 이미지 / 완료 인증 사진 버킷. 공개 읽기 + 로그인 사용자 업로드.
insert into storage.buckets (id, name, public)
values
  ('errand-images', 'errand-images', true),
  ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "errand_images_public_read"
on storage.objects for select
using (bucket_id = 'errand-images');

create policy "errand_images_authenticated_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'errand-images');

create policy "proofs_public_read"
on storage.objects for select
using (bucket_id = 'proofs');

create policy "proofs_authenticated_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'proofs');
