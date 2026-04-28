-- Create public bucket for daily JSON snapshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('deals-snapshots', 'deals-snapshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access
DROP POLICY IF EXISTS "Public can read deals snapshots" ON storage.objects;
CREATE POLICY "Public can read deals snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'deals-snapshots');

-- Only service role writes (edge function uses service role key)
DROP POLICY IF EXISTS "Service role can write deals snapshots" ON storage.objects;
CREATE POLICY "Service role can write deals snapshots"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'deals-snapshots');

DROP POLICY IF EXISTS "Service role can update deals snapshots" ON storage.objects;
CREATE POLICY "Service role can update deals snapshots"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'deals-snapshots');

DROP POLICY IF EXISTS "Service role can delete deals snapshots" ON storage.objects;
CREATE POLICY "Service role can delete deals snapshots"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'deals-snapshots');

-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;