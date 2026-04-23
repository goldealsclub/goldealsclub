
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_id UUID,
  session_id TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_viewed_at ON public.page_views(viewed_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_session ON public.page_views(session_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon cannot read page views"
  ON public.page_views FOR SELECT
  TO anon
  USING (false);
