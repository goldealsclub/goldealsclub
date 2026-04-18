-- 1. Drop stale Snipes FR (replaced by Snipes EU)
DELETE FROM public.deals WHERE merchant = 'Snipes FR';

-- 2. Drop deals with inverted pricing (rrp < sale = nonsensical discount)
DELETE FROM public.deals
WHERE original_price IS NOT NULL
  AND sale_price IS NOT NULL
  AND original_price < sale_price;

-- 3. Normalize brand casing
UPDATE public.deals SET brand = 'adidas' WHERE brand = 'Adidas';