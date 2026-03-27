
-- Fix the view to use security invoker (default) so RLS on outbound_clicks is respected
DROP VIEW IF EXISTS public.click_stats;

CREATE VIEW public.click_stats
WITH (security_invoker = true)
AS
SELECT
  oc.deal_id,
  d.title AS deal_title,
  d.brand,
  d.category,
  d.merchant,
  COUNT(*) AS click_count,
  MIN(oc.clicked_at) AS first_click,
  MAX(oc.clicked_at) AS last_click
FROM public.outbound_clicks oc
LEFT JOIN public.deals d ON d.id = oc.deal_id
GROUP BY oc.deal_id, d.title, d.brand, d.category, d.merchant;
