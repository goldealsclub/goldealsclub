-- Create public storage bucket for daily generated TikTok videos
insert into storage.buckets (id, name, public)
values ('tiktok-videos', 'tiktok-videos', true)
on conflict (id) do update set public = true;

-- Public read access
create policy "Public can read tiktok videos"
on storage.objects for select
to public
using (bucket_id = 'tiktok-videos');

-- Only service role can write (used by GitHub Actions)
create policy "Service role can upload tiktok videos"
on storage.objects for insert
to service_role
with check (bucket_id = 'tiktok-videos');

create policy "Service role can update tiktok videos"
on storage.objects for update
to service_role
using (bucket_id = 'tiktok-videos');