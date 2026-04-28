CREATE INDEX IF NOT EXISTS idx_deals_merchant_detected_at_desc
ON public.deals (merchant, detected_at DESC NULLS LAST);