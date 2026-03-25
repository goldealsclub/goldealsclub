CREATE TABLE public.outbound_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  user_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  destination_url text
);

ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks" ON public.outbound_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "No public reads" ON public.outbound_clicks
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE INDEX idx_outbound_clicks_deal ON public.outbound_clicks(deal_id);
CREATE INDEX idx_outbound_clicks_time ON public.outbound_clicks(clicked_at);