import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Infer correct category from title keywords */
function inferCategory(category: string, title: string): string {
  const t = ` ${(title || "").toLowerCase()} `;

  // 1. Jackets FIRST – "Short Puffer Jacket" must not match "short " in pants
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","wind breaker","windrunner","coupe-vent","bomber","puffer","gilet","weste","overshirt","vest ","anorak","softshell","teddy ","cagoule","firebird tt","jacke ","sherpa","traningsjacke","sst tt","cardigan","mount hope","winterized","wr fz","adverzip","shacket","satin bomber","woven-vest","quilted club","bomberjacket"];
  if (jacketKw.some(k => t.includes(k))) return "vestes";

  // 2. Hoodies – check before pants so "Sweat" doesn't match sweatpant logic
  const hoodieKw = ["hoodie","sweat ","sweat,","sweats ","capuche","pullover","crew neck","crewneck","sweater","sweatjacket","tracktop","track top","trainingstop","zip top","halfzip","half-zip","half zip","zipper ","fleece","flc po ","troyer","full zip track","knit hood","boxy crew","graphic crew","essential crew","logo crew","oversized crew","mohair ","jacquard "];
  const hoodieExclude = ["short","pant","jogger","legging","bermuda","cargo","jogging","jeans","jean ","tracksuit","track suit","sweatpant","skirt","jupe","robe ","dress ","sock","socks","socken","chaussette"];
  if (hoodieKw.some(k => t.includes(k)) && !hoodieExclude.some(k => t.includes(k))) return "hoodies";

  // 3. Pants – removed "short " (catches jackets), "denim" (catches denim jackets), tightened "sweat" to "sweatpant"
  const pantsKw = ["pantalon","jogger","pant ","pants","legging","shorts","bermuda","cargo","jogging","jean ","jeans","flared","flare ","slim fit","baggy","survêtement","ensemble","trainingsanzüge","straight tp","tracküants","trackpant","track pant","sweatpant","sweatpants","training pant","tracksuit","trainingsanzug","track suit","inseam","trainingshose","jggr ","bootcut","jogginghose","overall dress"];
  if (pantsKw.some(k => t.includes(k))) return "pantalons";

  // 4. T-shirts
  const tshirtKw = ["t-shirt","tee ","tee,","tee-","jersey","polo ","maillot","débardeur","tank top","tanktop","shortsleeve","short sleeve","short-sleeve"," crew ","trikot","chemise","pintuck t ","cropped t ","baseball shirt","baseballshirt"," shirt ","shirt,","crop top","v-neck","mesh button front","dress ","swingman","polytee","graphic tee","boxy tee"];
  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";

  // 5. Accessories
  const accessKw = ["casquette","cap ","cap,","sac ","bag ","bag,","backpack","bagpack","chaussette","sock","socks","socken","bonnet","beanie","ceinture","belt","écharpe","scarf","gant","glove","porte","wallet","lunette","bandeau","headband","chapeau","hat ","9forty","9twenty","9fifty","59fifty","mvp ","new era","flexfit","durag","balaclava","bauchtasche","crossbody","neckwarmer","chain ","bikini","trunk ","trunks","cache-cou","cache-oreilles","brassard","bracelet","caleçon","boxer","boxers","briefs","underwear","slip ","underpant","sous-vêtement","blitzing","cuff ","fitted ","visor","brim","tumbler","stanley","quencher"," ball ","deflated","romper","hipbag","fanny","springer","duffle","airliner","casio","watch ","montre","snapback","bucket ","trucker","strapback","dad cap","waist bag","mini bag","shoulder bag","tote ","clutch","keychain","porte-clé","sunglasses","lunettes","g-shock","day pak","patrol pack","convertible hood","5 panel","a frame","curve brim","w-202","track set","quarter sock"];
  if (accessKw.some(k => t.includes(k))) return "accessoires";

  // Sneakers: removed "runner " (matches windrunner), added missing shoe models
  const sneakerKw = ["sneaker","basket ","baskets","chaussure","shoe","footwear","air max","air force","dunk","jordan post","jordan 1 ","jordan 4 ","jordan 5 ","jordan 11","yeezy","new balance ","574","990","2002r","2002","gel-","gel ","asics","old skool","sk8-","chuck taylor","converse","all star","stan smith","superstar","forum","gazelle","samba","campus","ozweego","ultraboost","slide","mule","sandale","tong","tongs","adilette","claquette","arizona eva","dr. martens","dr martens","vans ","era ","palermo","suede ","classic az","croco ","offcourt","slingback","reebok classic","puma cali","knu skool","lowpro","stealthform","cloudmonster","cloudswift","speedcross","xt-6","v2 ","made in ","fresh foam","fuelcell","1906","hoka ","clifton","bondi ","arahi","timberland ","premium 6","chukka","boat shoe","loafer","mocassin","espadrille","sabot","birkenstock","speedcat","mostro","predator sala","technochaos","spiritain","spiritian","adistar","megaride","ghostride","taekwondo","firebird lacett","spacer cutline","galaxy og","dame x ","tokyo w ","zx 500","total 90","vertebrae","gato ","sb chron","sb force","inhale ","fade nitro","arizona nylon","creeper","pluto ","neo run","citigo","shadow skate","venice skate","skate low","command ","club low ","h-street","lafranc","la franc","lxry 2k","lxyr 2k","89 2k","89 prm","89 up","89 tailor","89 classic","89 lxry","89 tongue","89 logo","prime runner","goalgetter","goldenglow","session ","stadium 90","court graffik"," stag ","dc stag","infinite pro","echo ","aura ","ld-1000","play off speckle","jordan los","pipah plateau","classic ultra mini","classic mini ","tazz","disquette","lowmel","funkette","tazzelle","classic micro","cora sand","t-clip","spinor","l003 ","cloud 6","cloudtilt","cloudsurfer","cloudvista","cloudnova","xt-whisper","acs+","acs +","ava rover","avanti ","pointe ","hammer street","r400 ","club c ","skepta ","italia 70s","japan w ","anthony edwards","jordan remix","salomon ","on cloud","tasman","trekker","train 89","masters court","bedford","stone street","hylane","motion 6","cloudzone","box logo","sprint trekker","euro trekker","field trekker","lace up","serenus","tiger runner","lyte classic","pro blaze","327 ","kani runner","hrt ","jumpman mvp","adrian ","boston ","204 ","471 ","1000 ","runner prm","puff taylor","puff player","spiridon","zoom spiridon","spizike","air zoom","air rift","pegasus","vomero","winflo","react ","flyknit","presto","huarache","tuned ","tn ","air more","uptempo","max 90","max 95","max 97","max 1 ","max 270","max 720"];
  if (sneakerKw.some(k => t.includes(k))) return "sneakers";

  return category;
}

/** Infer brand from title when merchant set brand to itself */
function inferBrand(brand: string, title: string): string {
  if (brand.toLowerCase() !== "snipes" && brand.toLowerCase() !== "kappa") return brand;
  if (brand.toLowerCase() === "kappa") return "Kappa";

  const MULTI_WORD_BRANDS = [
    "Low Lights Studios","New Balance","New Era","Karl Kani","Polo Ralph Lauren","Polo Sport",
    "Dr. Martens","Under Armour","Smoke Rise","Sergio Tacchini","True Religion",
    "Von Dutch","Mitchell & Ness","G-SHOCK","Another Cotton","Nike SB",
    "The North Face","2Y Studios","47 Brand",
  ];
  const SINGLE_WORD_BRANDS = new Set([
    "Nike","adidas","Jordan","UGG","ASICS","PUMA","Converse","Vans","Pegador",
    "Dickies","Lacoste","Timberland","On","Prohibited","HALO","Salomon",
    "Reebok","Fila","Casio","Carhartt","Champion","Ellesse","Kappa","Starter",
    "Columbia","Levi's","Stance","Oakley","Tommy","Birkenstock",
    "Saucony","Crocs","Merrell","Clarks","Hoka","Stanley","2Y","Small",
    "DC","Buffalo","Decibel","Eastpak","Umbro","Snipes",
  ]);

  // Keyword-based brand detection — order matters (most specific first)
  const KEYWORD_BRANDS: [string[], string][] = [
    // Nike (including product codes like "M NK", "W NK", "B NK")
    [["air max","air force","air jordan","air zoom","air huarache","sportswear","dri-fit","dri fit","tech fleece",
      "acg ","wmns ","nsw ","sb force","sb chron","sb dunk","blazer","cortez","pegasus","vomero",
      "shox ","total 90","windrunner","tech woven","one dri-fit","dunk low","dunk high",
      "m nk ","w nk ","b nk ","force 1 ","p-6000","spizike","waffle one","react ","flyknit",
      "air rift","huarache","indy bra","swoosh","renew","downshifter","revolution ","wearallday",
      "crater impact","presto ","killshot","tailwind","structure ","zoom fly","vapormax","invincible",
      "panda retro","nk df ","nk dry","nk club","tech pack","everyday max","everyday plus",
      "everyday cotton stretch","m nsw","w nsw","nsw essential","nsw club","nike "], "Nike"],

    // adidas
    [["superstar","adicolor","firebird","ozweego","forum ","campus ","gazelle","samba","stan smith",
      "nmd ","yeezy","ultraboost","spezial","adilette","zx ","la franc","taekwondo","italia 70s",
      "spiritain","spiritian","galaxy og","dame x ","spacer cutline","sl 72","climacool",
      "teamgeist","adistar","megaride","predator","rivalry ","handball spezial","marathon ",
      "response ","busenitz","3-streifen","3-stripes","trefoil","adibreak","3 stripes",
      "adiletten","sambae","handball ","badlander","adi2000","adifom","ozelia","retropy",
      "country og","sl72","centennial","adi ","adicolour"], "adidas"],

    // Jordan
    [["jumpman","jordan ","jdb ","j brkln","flight ","los ","brooklyn ","spizike low",
      "jordan remix","jordan los","jordan post","jordan 1","jordan 4","jordan 5","jordan 11",
      "jordan mvp","j flight"], "Jordan"],

    // New Balance
    [["fresh foam","fuelcell","2002r","2002 ","574 ","990 ","327 ","1906","9060","740 ","530 ",
      "1000 ","204 ","550 ","480 ","1080","860 ","linear heritage","nb essentials",
      "sport essentials","athletics remastered","numeric ","made in usa","made in uk",
      "hoops "], "New Balance"],

    // PUMA
    [["speedcat","mostro","suede xl","suede ","cali ","fenty","avanti ","rs-x","rs x","mayze",
      "ca pro","fade nitro","halo runner","puma ","palermo ","clyde ","blaze of glory",
      "mb.","lamelo","disc ","rider ","mirage","future rider","wild rider","trinity "], "PUMA"],

    // ASICS
    [["gel-","gel ","tiger runner","lyte classic","japan w ","tokyo w ","gt-2160","gt-1000",
      "gt-2000","kayano","nimbus","cumulus","noosa"], "ASICS"],

    // Converse
    [["chuck taylor","chuck 70","pro blaze","puff taylor","puff player","all star",
      "one star","weapon ","cons "], "Converse"],

    // UGG
    [["classic mini","tazz","disquette","lowmel","funkette","tazzelle","tasman","classic ultra",
      "dipper","classic micro","pipah ","goldenstar","cora sand","scuffette"], "UGG"],

    // Vans
    [["old skool","sk8-","knu skool","era ","authentic ","slip-on","ultrarange",
      "rowley classic","lowland"], "Vans"],

    // Reebok
    [["classic nylon","club c ","cardi slide","question ","answer ","nano x","classic leather",
      "workout plus","instapump","pump fury","bb 4000"], "Reebok"],

    // Salomon
    [["acs+","acs +","xt-6","xt-whisper","speedcross","xt-4","acs pro","rx moc"], "Salomon"],

    // On
    [["cloud 6","cloudtilt","cloudsurfer","cloudvista","cloudnova","cloudmonster","cloudswift",
      "cloudzone","roger pro","the roger"], "On"],

    // Hoka
    [["clifton","bondi ","arahi","motion 6","mafate","speedgoat","rincon","mach "], "Hoka"],

    // Lacoste
    [["t-clip","l003 ","croco ","carnaby","chaymon","lerond","powercourt","run spin",
      "l spin","l004"], "Lacoste"],

    // Stanley
    [["quencher","iceflow","flowstate","protour","h2.o"], "Stanley"],

    // Carhartt
    [["serif logo","pocket tee","single knee","chase ","american script","wip "], "Carhartt"],

    // Under Armour
    [["heatgear","coldgear","unstoppable","hovr ","blitzing","ua ","charged ","armour fleece",
      "tech graphic","rival fleece","sportstyle"], "Under Armour"],

    // Dickies
    [["eisenhower","874 ","dickies ","flex "], "Dickies"],

    // Champion
    [["powerblend","reverse weave","rochester"], "Champion"],

    // Polo Ralph Lauren
    [["train 89","masters court","bedford","hrt ","polo bear","big pony"], "Polo Ralph Lauren"],

    // DC
    [["stag ","court graffik","infinite pro","dc "], "DC"],

    // New Era
    [["9forty","9twenty","9fifty","59fifty","mvp base","base runner","clean up","a frame",
      "5 panel","new york yankees","los angeles dodgers","los angeles lakers","chicago bulls",
      "brooklyn nets","fitted cap","cuff beanie","curve brim","trucker cap","wide cuff beanie",
      "essential cuff"], "New Era"],

    // Timberland
    [["sprint trekker","euro trekker","field trekker","premium 6","stone street",
      "hylane","6-inch","timberland ","euro sprint"], "Timberland"],

    // Karl Kani
    [["89 2k","89 prm","89 up","89 tailor","89 classic","89 lxry","89 tongue","89 logo",
      "prime runner","kani runner","kani ","retro "], "Karl Kani"],

    // Mitchell & Ness
    [["mlb ","nba ","nfl ","collegiate script","washed script","poly track set",
      "swingman","team logo","varsity satin"], "Mitchell & Ness"],

    // Birkenstock
    [["arizona","boston ","gizeh","arizona eva","arizona nylon"], "Birkenstock"],

    // Casio / G-SHOCK
    [["casio","g-shock","mtp-","mrw-"], "Casio"],

    // Fila
    [["disruptor","fila ray","fila ","grant hill"], "Fila"],

    // Ellesse
    [["ellesse","lombardy","torices","prado"], "Ellesse"],

    // Columbia
    [["columbia ","bugaboo","silver ridge","newton ridge"], "Columbia"],

    // Snipes own brand
    [["inhale ","citigo","serenus","neo run","runner prm","goalgetter","goldenglow","session ",
      "stadium 90","play off","echo ","aura ","pluto ","shadow skate","venice skate","skate low",
      "command ","club low ","h-street","delta ","lxry 2k","lxyr 2k",
      "hidden in plain","far away from","box logo","reflective globe","another ",
      "vortex knit","union jacquard","metal signature","small logo","small signature",
      "snipes varsity","snipes essential","snipes box","french terry small",
      "jersey small logo","varsity raglan","pintuck","sport diamond",
      "carson ","bobby ","adrik ","in game","coated light","horse racer",
      "signar ","peak satin","liberty baseball","color block & piping",
      "shining lights","praying mary","babygal","mini sweat skirt","heart oversized",
      "running wild","everyday oxford","college tee","hooded-sweatshirt box",
      "long sleeve-sweatshirt","og trackpants","velvet track","loose jersey",
      "woven tapered","jersey tee","graphics tee","tech sport","long sleeve full zip",
      "waist length full zip","long sleeve rugby","sport-tanktop"], "Snipes"],
  ];

  const t = title || "";
  const tl = ` ${t.toLowerCase()} `;

  // Multi-word brand prefix match
  for (const mw of MULTI_WORD_BRANDS) {
    if (t.toLowerCase().startsWith(mw.toLowerCase())) return mw;
  }
  // Single-word brand prefix match
  const firstWord = t.split(/\s+/)[0];
  if (firstWord && SINGLE_WORD_BRANDS.has(firstWord)) return firstWord;

  // Keyword-based detection
  for (const [keywords, brandName] of KEYWORD_BRANDS) {
    if (keywords.some(k => tl.includes(k))) return brandName;
  }

  // If merchant is Snipes and we can't determine brand, keep "Snipes"
  return "Snipes";
}

/** Infer gender from description and title */
function inferGender(genderField: string, description: string, title: string): string {
  const combined = ` ${(description || "").toLowerCase()} ${(title || "").toLowerCase()} `;

  // Enfant-specific — check FIRST since "Enfant" in title is definitive
  // Exclude "junior mesure" which is a model name in Snipes descriptions
  const enfantKw = ["pour ado","pour enfant"," enfant","enfants","enfant ",
    "kids","junior","bébé","nourrisson","toddler","infant","little kids",
    "big kids","td ","ps ","gs ","(gs)","(td)","(ps)","youth",
    "jeune enfant","petit enfant","newborn","nouveau-né",
    "tee & short set","short set ","kinder"];
  const enfantExclude = ["baby tee","bra ","crop","robe di kappa","junior mesure","junior porte"];
  if (enfantKw.some(k => combined.includes(k)) && !enfantExclude.some(k => combined.includes(k))) return "enfant";

  // Femme-specific
  const femmeKw = ["pour femme","pour fille","women","woman","wmns","w's ","ladies",
    "baby tee","bra ","brassière","legging","sports bra","sport bra","crop top",
    "cropped top","mini skirt","mini jupe","dress ","bikini top",
    "yoga ","maternity","enceinte","low waist"];
  const femmeExclude = ["robe di kappa"];
  if (femmeKw.some(k => combined.includes(k)) && !femmeExclude.some(k => combined.includes(k))) return "femme";

  // Homme
  if (combined.includes("pour homme") || combined.includes("pour garçon") || combined.includes("men's") || combined.includes("for men")) return "homme";

  const g = (genderField || "").toLowerCase();
  if (g === "homme" || g === "men") return "homme";
  if (g === "femme" || g === "women") return "femme";
  if (g === "enfant" || g === "kids") return "enfant";
  if (g === "unisexe" || g === "unisex") return "unisexe";
  return "unisexe";
}

function genderToLabel(gender: string): string {
  switch (gender) {
    case "homme": return "Homme";
    case "femme": return "Femme";
    case "enfant": return "Enfant";
    case "unisexe": return "Unisexe";
    default: return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const deals = await req.json();

    if (!Array.isArray(deals)) {
      return new Response(JSON.stringify({ error: "Expected array of deals" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allowed columns in the deals table
    const allowedKeys = new Set([
      "id", "title", "brand", "category", "gender", "gender_label",
      "sale_price", "original_price", "discount_percent", "image_url",
      "product_url", "affiliate_url", "merchant", "source", "currency", "description",
      "promo_start_date", "promo_end_date", "is_super_deal", "detected_at",
      "deal_level", "flame_count", "display_score", "popularity", "saved",
    ]);

    // Clean deals: generate IDs, strip unknown columns, fix categories/brands
    const cleaned = deals.map((d: any, i: number) => {
      const row: Record<string, any> = {};
      for (const [k, v] of Object.entries(d)) {
        if (allowedKeys.has(k)) row[k] = v;
      }

      // Generate ID if missing
      row.id = row.id || `deal-${i}-${(d.title || "").slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;

      // Fix brand
      row.brand = inferBrand(row.brand || "", row.title || "");

      // Fix category via title analysis
      row.category = inferCategory(row.category || "autres", row.title || "");

      // Fix gender
      row.gender = inferGender(row.gender || "", row.description || "", row.title || "");
      row.gender_label = genderToLabel(row.gender);

      // Recalculate deal level from discount
      if (row.original_price && row.sale_price && row.original_price > row.sale_price) {
        row.discount_percent = Math.round(((row.original_price - row.sale_price) / row.original_price) * 100);
      }
      const dp = row.discount_percent ?? 0;
      if (dp >= 50) { row.deal_level = "hot-deal"; row.flame_count = 3; }
      else if (dp >= 30) { row.deal_level = "bon-deal"; row.flame_count = 2; }
      else { row.deal_level = "promo-normale"; row.flame_count = 1; }

      return row;
    });

    // Upsert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
      const { error } = await supabase
        .from("deals")
        .upsert(batch, { onConflict: "id" });
      if (error) throw error;
      inserted += batch.length;
    }

    // Delete deals not in this import batch (paginate to avoid 1000-row limit)
    const importedIds = new Set(cleaned.map((d: any) => d.id));
    let deletedCount = 0;
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await supabase.from("deals").select("id").range(from, from + pageSize - 1);
      if (!page || page.length === 0) break;
      const toDelete = page.filter((d: any) => !importedIds.has(d.id)).map((d: any) => d.id);
      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 500) {
          const batch = toDelete.slice(i, i + 500);
          await supabase.from("deals").delete().in("id", batch);
        }
        deletedCount += toDelete.length;
      }
      if (page.length < pageSize) break;
      from += pageSize;
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted, deleted: deletedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
