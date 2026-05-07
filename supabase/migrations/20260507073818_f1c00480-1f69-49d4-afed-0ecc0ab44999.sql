CREATE TABLE IF NOT EXISTS public.generated_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date date NOT NULL,
  category text NOT NULL,
  label text NOT NULL DEFAULT '',
  storage_path text NOT NULL,
  public_url text NOT NULL,
  caption text DEFAULT '',
  hashtags text DEFAULT '',
  size_bytes bigint DEFAULT 0,
  duration_sec integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read generated_videos"
  ON public.generated_videos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert generated_videos"
  ON public.generated_videos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete generated_videos"
  ON public.generated_videos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS generated_videos_brief_date_idx
  ON public.generated_videos (brief_date DESC, created_at DESC);