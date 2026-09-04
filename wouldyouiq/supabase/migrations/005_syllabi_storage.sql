insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabi',
  'syllabi',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their syllabi" on storage.objects;
create policy "Users can read their syllabi"
on storage.objects for select
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their syllabi" on storage.objects;
create policy "Users can upload their syllabi"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their syllabi" on storage.objects;
create policy "Users can update their syllabi"
on storage.objects for update
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their syllabi" on storage.objects;
create policy "Users can delete their syllabi"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = auth.uid()::text
);
