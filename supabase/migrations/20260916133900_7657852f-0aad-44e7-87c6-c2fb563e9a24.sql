CREATE TABLE public.video_style_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  -- couleurs
  bg_top text NOT NULL DEFAULT '#f4f1ea',
  bg_mid text NOT NULL DEFAULT '#ebe6da',
  bg_bot text NOT NULL DEFAULT '#e3ddd1',
  ink text NOT NULL DEFAULT '#0a0a0a',
  ink_soft text NOT NULL DEFAULT 'rgba(10,10,10,0.55)',
  accent text NOT NULL DEFAULT '#0a0a0a',
  taupe text NOT NULL DEFAULT '#6a655c',
  -- typographie
  display_font text NOT NULL DEFAULT 'Archivo Black',
  body_font text NOT NULL DEFAULT 'Inter',
  -- titre
  title_font_size integer NOT NULL DEFAULT 52,
  title_uppercase boolean NOT NULL DEFAULT true,
  eyebrow_label text NOT NULL DEFAULT 'DEAL OF THE DAY',
  -- prix
  price_font_size integer NOT NULL DEFAULT 200,
  price_label text NOT NULL DEFAULT 'PRIX MEMBRE',
  show_strikethrough boolean NOT NULL DEFAULT true,
  show_discount_chip boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_style_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_style_settings TO authenticated;
GRANT ALL ON public.video_style_settings TO service_role;

ALTER TABLE public.video_style_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read video style settings"
ON public.video_style_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage video style settings"
ON public.video_style_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_video_style_settings_updated_at
BEFORE UPDATE ON public.video_style_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.video_style_settings (style_id, label, bg_top, bg_mid, bg_bot, ink, ink_soft, accent, taupe, display_font, body_font, title_font_size, title_uppercase, eyebrow_label, price_font_size, price_label, show_strikethrough, show_discount_chip) VALUES
('adidas','Adidas','#f4f1ea','#ebe6da','#e3ddd1','#0a0a0a','rgba(10,10,10,0.55)','#0a0a0a','#6a655c','Archivo Black','Inter',52,true,'DEAL OF THE DAY',200,'PRIX MEMBRE',true,true),
('zara','Zara','#e6e3de','#d8d4cd','#c7c2ba','#0a0a0a','rgba(20,20,20,0.5)','#1a1a1a','#5a5650','Playfair Display','Inter',52,false,'Sélection du jour',180,'Prix',true,false),
('nike','Nike','#f4f1ea','#ebe6da','#e3ddd1','#0a0a0a','rgba(10,10,10,0.55)','#fa5400','#6a655c','Archivo','Inter',50,true,'TODAY''S DROP',210,'PRIX DU JOUR',true,true);