CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals (category);
CREATE INDEX IF NOT EXISTS idx_deals_gender ON public.deals (gender);
CREATE INDEX IF NOT EXISTS idx_deals_id_btree ON public.deals (id);