
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  deal_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  session_id TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_deal ON public.events(deal_id) WHERE deal_id IS NOT NULL;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_type IS NOT NULL);

CREATE POLICY "Admins can read events"
  ON public.events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon cannot read events"
  ON public.events FOR SELECT
  TO anon
  USING (false);
