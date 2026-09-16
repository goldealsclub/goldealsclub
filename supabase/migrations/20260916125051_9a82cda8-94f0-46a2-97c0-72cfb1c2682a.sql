ALTER TABLE public.generated_videos
  ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'adidas',
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS generated_videos_published_idx
  ON public.generated_videos (is_published, published_at DESC);

GRANT SELECT ON public.generated_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_videos TO authenticated;
GRANT ALL ON public.generated_videos TO service_role;

DROP POLICY IF EXISTS "Anyone can read published videos" ON public.generated_videos;
CREATE POLICY "Anyone can read published videos"
ON public.generated_videos
FOR SELECT
TO anon, authenticated
USING (is_published = true AND published_at IS NOT NULL AND published_at <= now());

DROP POLICY IF EXISTS "Admins can update generated_videos" ON public.generated_videos;
CREATE POLICY "Admins can update generated_videos"
ON public.generated_videos
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));