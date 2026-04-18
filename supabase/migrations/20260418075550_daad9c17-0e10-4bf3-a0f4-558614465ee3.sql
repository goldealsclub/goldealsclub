UPDATE deals
SET category = CASE
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(slip de bain|maillot de bain|bikini|swimsuit|swim short|boardshort|swimwear|swim brief)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(brassi[èe]re|sports bra|sport bra|culotte|boxer|underwear|sous-v[êe]tement|lingerie|caleçon|string|tanga)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(chaussette|socquette| sock | socks | bas |collant|tights|gants|glove|mitten|masque| mask |bandeau|headband|wristband|poignet)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(casquette| cap |bonnet|beanie|chapeau| hat |bucket hat|9forty|59fifty)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '( sac | bag |backpack|sac à dos|gym bag|sport bag|tote|pochette|wallet|portefeuille|porte-monnaie)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(ceinture| belt |bracelet|collier|bague|jewel| watch |montre|sunglas|lunettes|écharpe|scarf|foulard)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(yoga (block|mat|brick)|bloc de yoga|tapis de yoga|haltère|dumbbell|kettlebell|élastique|resistance band|protège-tibia|shin guard|gourde| bottle |water bottle| towel |serviette)' THEN 'accessoires'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(costume |disguise|déguisement|rideau|curtain|cushion|coussin| drap |bedding|housse|décoration)' THEN 'autres'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '( short | shorts | bermuda)' THEN 'pantalons'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(jacket|veste|manteau|coat|blouson|parka|doudoune|bomber|puffer|gilet|anorak|softshell|shacket|coupe-vent|coupe vent|windbreaker)' THEN 'vestes'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(hoodie|sweat |capuche|pullover|crewneck|sweater|fleece|half-zip|full zip|sweatshirt)' AND LOWER(' ' || COALESCE(title,'') || ' ') !~ '(short|pant|jogger|legging|jeans|sweatpant|skirt|robe|sock)' THEN 'hoodies'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(pantalon|jogger| pant | pants |legging|jogging|jeans| jean |sweatpant|trackpant|tracksuit|cargo)' THEN 'pantalons'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(t-shirt| tee | tee-|jersey| polo |maillot|tank top| crew | shirt |débardeur|camisole)' THEN 't-shirts'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '(sneaker|basket|chaussure| shoe |air max|air force| dunk |jordan|yeezy|new balance| 574 | 990 |gel-|old skool|chuck taylor|stan smith|superstar|gazelle|samba|ultraboost|sandale|escarpin|talon|wedge heel|running|trainer)' THEN 'sneakers'
  WHEN LOWER(' ' || COALESCE(title,'') || ' ') ~ '( robe | dress | jupe | skirt )' THEN 'autres'
  ELSE 'autres'
END
WHERE source = 'awin';