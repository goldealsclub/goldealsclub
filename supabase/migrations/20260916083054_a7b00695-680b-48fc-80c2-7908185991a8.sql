-- 1. Purge des produits hors-sujet (pêche, nutrition) importés dans le catalogue
DELETE FROM public.deals
WHERE title ~* '(hame[çc]on|plomb(s)? |amor[çc]age|bouillette|boilie|app[âa]t|leurre|canne à p[êe]che|moulinet|bas de ligne|t[êe]te plomb[ée]e|p[êe]che|carpe|carp |fishing|rod pod|[ée]puisette|bivvy|fluorocarbon|nasse|[ée]merillon|swivel|hookbait|method feeder|cage feeder|whey|cr[ée]atine|prot[ée]ine en poudre|compl[ée]ment alimentaire)';

-- 2. Reclassement du genre pour les fiches marquées "unisexe" par défaut
UPDATE public.deals
SET gender = 'enfant', gender_label = 'Enfant'
WHERE gender = 'unisexe'
  AND title ~* '(enfant|kids|junior|b[ée]b[ée]|toddler|youth|kinder|gar[çc]on|fille|\(GS\)|\(PS\)|\(TD\))';

UPDATE public.deals
SET gender = 'femme', gender_label = 'Femme'
WHERE gender = 'unisexe'
  AND title ~* '(femme|women|woman|wmns|ladies|damen|brassi[èe]re|sports bra|crop top|robe |jupe |bikini)';

UPDATE public.deals
SET gender = 'homme', gender_label = 'Homme'
WHERE gender = 'unisexe'
  AND title ~* '(homme|men''s|for men|herren|mens )';