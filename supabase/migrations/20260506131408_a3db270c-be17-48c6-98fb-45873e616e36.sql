CREATE TABLE public.daily_video_briefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date date NOT NULL UNIQUE,
  focus_brand text NOT NULL,
  deals jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_video_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read briefs"
  ON public.daily_video_briefs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_daily_video_briefs_date ON public.daily_video_briefs(brief_date DESC);