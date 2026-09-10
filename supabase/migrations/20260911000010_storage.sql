-- Phase 5: file storage. Replaces convex/images.ts.
--
-- The Convex flow was three round trips and a compensating action:
-- generateUploadUrl -> POST the file -> validateUpload, which re-read the
-- stored blob, checked content type and size, and DELETED it if either was
-- wrong. That second pass existed because the upload URL could not itself
-- constrain what was sent to it, so the only enforcement point was after the
-- bytes had already landed.
--
-- Supabase Storage enforces both at the bucket, before the object is created,
-- so the validate-and-delete step has no reason to exist. Same limits: 5MB,
-- and jpeg/png/webp only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  -- Public READ. These are avatars, card art and property photos rendered on
  -- public profile pages for anonymous visitors; a signed URL would have to be
  -- minted per image per page view for content that is public by design.
  -- Writes are still restricted below.
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- Ownership is encoded in the object path: <user-uuid>/<file>. The first path
-- segment is compared against auth.uid(), so a user can only write inside
-- their own folder and cannot overwrite or delete somebody elses image by
-- guessing its name.
create policy profile_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-images');

create policy profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy profile_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy profile_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
