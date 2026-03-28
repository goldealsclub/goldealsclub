-- 1. Fix: articles with "Enfant" in title tagged as homme → enfant
UPDATE public.deals SET gender = 'enfant', gender_label = 'Enfant'
WHERE gender != 'enfant'
AND (
  LOWER(title) LIKE '% enfant%'
  OR LOWER(title) LIKE '%enfant %'
  OR LOWER(title) LIKE '%kinder%'
)
AND LOWER(title) NOT LIKE '%baby tee%'
AND LOWER(title) NOT LIKE '%robe di kappa%';

-- 2. Fix: articles with femme keywords tagged as homme → femme
UPDATE public.deals SET gender = 'femme', gender_label = 'Femme'
WHERE gender = 'homme'
AND (
  LOWER(title) LIKE '%low waist%'
  OR LOWER(title) LIKE '%mini skirt%'
  OR LOWER(title) LIKE '%mini jupe%'
  OR LOWER(title) LIKE '%yoga %'
  OR LOWER(title) LIKE '%pour femme%'
  OR LOWER(title) LIKE '%women%'
  OR LOWER(title) LIKE '%wmns%'
  OR LOWER(title) LIKE '%ladies%'
  OR LOWER(title) LIKE '%crop top%'
  OR LOWER(title) LIKE '%legging%'
  OR LOWER(title) LIKE '%baby tee%'
  OR LOWER(title) LIKE '%sport bra%'
  OR LOWER(title) LIKE '%sports bra%'
  OR LOWER(title) LIKE '%brassière%'
)
AND LOWER(title) NOT LIKE '%robe di kappa%';

-- 3. Fix: socks categorized as t-shirts or hoodies → accessoires
UPDATE public.deals SET category = 'accessoires'
WHERE category != 'accessoires'
AND (
  LOWER(title) LIKE '%sock%'
  OR LOWER(title) LIKE '%socken%'
  OR LOWER(title) LIKE '%chaussette%'
);

-- 4. Fix socks that are unisex (packs without gender indicator)
UPDATE public.deals SET gender = 'unisexe', gender_label = 'Unisexe'
WHERE category = 'accessoires'
AND (LOWER(title) LIKE '%sock%' OR LOWER(title) LIKE '%socken%' OR LOWER(title) LIKE '%chaussette%')
AND LOWER(title) NOT LIKE '%homme%'
AND LOWER(title) NOT LIKE '%femme%'
AND LOWER(title) NOT LIKE '%enfant%'
AND LOWER(title) NOT LIKE '%women%'
AND LOWER(title) NOT LIKE '%men %'
AND LOWER(title) NOT LIKE '%kids%';