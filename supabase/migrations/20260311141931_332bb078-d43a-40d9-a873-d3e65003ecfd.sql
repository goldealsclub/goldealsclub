
-- Deals table to store deals in DB
CREATE TABLE public.deals (
  id text PRIMARY KEY,
  title text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  gender text NOT NULL DEFAULT 'unisexe',
  gender_label text DEFAULT '',
  sale_price numeric,
  original_price numeric,
  discount_percent numeric,
  image_url text DEFAULT '',
  product_url text NOT NULL,
  merchant text NOT NULL,
  source text DEFAULT '',
  currency text DEFAULT 'EUR',
  description text DEFAULT '',
  promo_start_date timestamptz,
  promo_end_date timestamptz,
  is_super_deal boolean DEFAULT false,
  deal_level text DEFAULT 'promo-normale',
  flame_count integer DEFAULT 1,
  display_score numeric DEFAULT 0,
  popularity integer DEFAULT 0,
  saved boolean DEFAULT false,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Everyone can read deals
CREATE POLICY "Anyone can read deals"
ON public.deals FOR SELECT
TO anon, authenticated
USING (true);

-- Email alert preferences
CREATE TABLE public.email_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  frequency text DEFAULT 'daily',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert preferences"
ON public.email_alert_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
ON public.email_alert_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
ON public.email_alert_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for deals to detect new ones
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
