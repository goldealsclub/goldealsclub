
-- Fix gender: "baby tee", "bra", "crop top", "dress " items should be femme
UPDATE public.deals SET gender = 'femme', gender_label = 'Femme'
WHERE gender != 'femme'
AND (
  LOWER(title) LIKE '%baby tee%'
  OR LOWER(title) LIKE '%bra %'
  OR LOWER(title) LIKE '%sport bra%'
  OR LOWER(title) LIKE '%sports bra%'
  OR LOWER(title) LIKE '%crop top%'
  OR LOWER(title) LIKE '%legging%'
  OR (LOWER(title) LIKE '%dress %' AND LOWER(title) NOT LIKE '%dress shirt%')
);

-- Fix gender: kids sets should be enfant
UPDATE public.deals SET gender = 'enfant', gender_label = 'Enfant'
WHERE gender != 'enfant'
AND (
  LOWER(title) LIKE '%tee & short set%'
  OR LOWER(title) LIKE '%toddler%'
  OR LOWER(title) LIKE '%infant%'
  OR LOWER(title) LIKE '%little kids%'
  OR LOWER(title) LIKE '%big kids%'
  OR LOWER(title) LIKE '%(gs)%'
  OR LOWER(title) LIKE '%(td)%'
  OR LOWER(title) LIKE '%(ps)%'
);

-- Fix category: spiridon, spizike, air zoom etc should be sneakers
UPDATE public.deals SET category = 'sneakers'
WHERE category != 'sneakers'
AND (
  LOWER(title) LIKE '%spiridon%'
  OR LOWER(title) LIKE '%spizike%'
  OR LOWER(title) LIKE '%air zoom%'
  OR LOWER(title) LIKE '%pegasus%'
  OR LOWER(title) LIKE '%vomero%'
  OR LOWER(title) LIKE '%huarache%'
  OR LOWER(title) LIKE '%presto%'
  OR LOWER(title) LIKE '%air rift%'
  OR LOWER(title) LIKE '%flyknit%'
  OR LOWER(title) LIKE '%uptempo%'
);
