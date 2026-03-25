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
  const jacketKw = ["jacket","veste","manteau","coat","blouson","parka","doudoune","windbreaker","wind breaker","windrunner","coupe-vent","bomber","puffer","gilet","weste","overshirt","vest ","anorak","softshell","teddy ","cagoule","firebird tt","jacke ","sherpa","traningsjacke","sst tt","cardigan","mount hope","winterized","wr fz","adverzip"];
  if (jacketKw.some(k => t.includes(k))) return "vestes";

  // 2. Hoodies – check before pants so "Sweat" doesn't match sweatpant logic
  const hoodieKw = ["hoodie","sweat ","sweat,","sweats ","capuche","pullover","crew neck","crewneck","sweater","sweatjacket","tracktop","track top","trainingstop","zip top","halfzip","half-zip","half zip","zipper ","fleece","flc po ","troyer","full zip track"];
  if (hoodieKw.some(k => t.includes(k))) return "hoodies";

  // 3. Pants – removed "short " (catches jackets), "denim" (catches denim jackets), tightened "sweat" to "sweatpant"
  const pantsKw = ["pantalon","jogger","pant ","pants","legging","shorts","bermuda","cargo","jogging","jean ","jeans","flared","flare ","slim fit","baggy","survêtement","ensemble","trainingsanzüge","straight tp","tracküants","trackpant","track pant","sweatpant","sweatpants","training pant","tracksuit","trainingsanzug","track suit","inseam","trainingshose","jggr ","bootcut"];
  if (pantsKw.some(k => t.includes(k))) return "pantalons";

  // 4. T-shirts
  const tshirtKw = ["t-shirt","tee ","tee,","tee-","jersey","polo ","maillot","débardeur","tank top","tanktop","shortsleeve","short sleeve","short-sleeve"," crew ","trikot","chemise","pintuck t ","cropped t ","baseball shirt","baseballshirt"," shirt ","shirt,","crop top","v-neck","mesh button front","dress ","swingman"];
  if (tshirtKw.some(k => t.includes(k))) return "t-shirts";

  // 5. Accessories – removed "knit " (catches hoodies)
  const accessKw = ["casquette","cap ","cap,","sac ","bag ","bag,","backpack","bagpack","chaussette","sock","bonnet","beanie","ceinture","belt","écharpe","scarf","gant","glove","porte","wallet","lunette","bandeau","headband","chapeau","hat ","9forty","9twenty","9fifty","59fifty","mvp ","new era","flexfit","durag","balaclava","bauchtasche","crossbody","neckwarmer","chain ","bikini","trunk ","trunks","cache-cou","cache-oreilles","brassard","bracelet","caleçon","boxer","boxers","briefs","underwear","slip ","underpant","sous-vêtement","blitzing","cuff ","fitted ","visor","brim","tumbler","stanley","quencher"," ball ","deflated","romper","hipbag","fanny","springer","duffle","airliner","casio","watch ","montre","snapback","bucket ","trucker","strapback","dad cap","waist bag","mini bag","shoulder bag","tote ","clutch","keychain","porte-clé","sunglasses","lunettes","g-shock","day pak","patrol pack","convertible hood"];
  if (accessKw.some(k => t.includes(k))) return "accessoires";

  // Sneakers: removed "runner " (matches windrunner), added missing shoe models
  const sneakerKw = ["sneaker","basket ","baskets","chaussure","shoe","footwear","air max","air force","dunk","jordan post","jordan 1 ","jordan 4 ","jordan 5 ","jordan 11","yeezy","new balance ","574","990","2002r","gel-","gel ","asics","old skool","sk8-","chuck taylor","converse","all star","stan smith","superstar","forum","gazelle","samba","campus","ozweego","ultraboost","slide","mule","sandale","tong","tongs","adilette","claquette","arizona eva","dr. martens","dr martens","vans ","era ","palermo","suede ","classic az","croco ","offcourt","slingback","reebok classic","puma cali","knu skool","lowpro","stealthform","cloudmonster","cloudswift","speedcross","xt-6","v2 ","made in ","fresh foam","fuelcell","1906","hoka ","clifton","bondi ","arahi","timberland ","premium 6","chukka","boat shoe","loafer","mocassin","espadrille","sabot","birkenstock","speedcat","mostro","predator sala","technochaos","spiritain","spiritian","adistar","megaride","ghostride","taekwondo","firebird lacett","spacer cutline","galaxy og","dame x ","tokyo w ","zx 500","total 90","vertebrae","gato ","sb chron","sb force","inhale ","fade nitro","arizona nylon","creeper","pluto ","neo run","citigo","shadow skate","venice skate","skate low","command ","club low ","h-street","lafranc","la franc","lxry 2k","lxyr 2k","89 2k","89 prm","89 up","89 tailor","89 classic","89 lxry","prime runner","goalgetter","goldenglow","session ","stadium 90","court graffik"," stag ","dc stag","infinite pro","echo ","aura ","ld-1000","play off speckle","jordan los","pipah plateau","classic ultra mini","classic mini ","tazz","disquette","lowmel","funkette","tazzelle","classic micro","cora sand","t-clip","spinor","l003 ","cloud 6","cloudtilt","cloudsurfer","cloudvista","cloudnova","xt-whisper","acs+","acs +","ava rover","avanti ","pointe ","hammer street","r400 ","club c ","skepta ","italia 70s","japan w ","anthony edwards","jordan remix","salomon ","on cloud","tasman","trekker","train 89","masters court","bedford","stone street","hylane","motion 6","cloudzone","box logo","sprint trekker","euro trekker","field trekker","lace up"];
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
  ];
  const SINGLE_WORD_BRANDS = new Set([
    "Nike","adidas","Jordan","UGG","ASICS","PUMA","Converse","Vans","Pegador",
    "Dickies","Lacoste","Timberland","On","Prohibited","HALO","Salomon",
    "Reebok","Fila","Casio","Carhartt","Champion","Ellesse","Kappa","Starter",
    "Columbia","Levi's","Stance","Oakley","The North Face","Tommy","Birkenstock",
    "Saucony","Crocs","Merrell","Clarks","Hoka","Stanley","2Y","Small",
    "DC","Buffalo","Decibel","Eastpak","Umbro",
  ]);

  const t = title || "";
  for (const mw of MULTI_WORD_BRANDS) {
    if (t.toLowerCase().startsWith(mw.toLowerCase())) return mw;
  }
  const firstWord = t.split(/\s+/)[0];
  if (firstWord && SINGLE_WORD_BRANDS.has(firstWord)) return firstWord;
  if (firstWord && firstWord.length > 1) return firstWord;
  return brand;
}

/** Infer gender from description and title */
function inferGender(genderField: string, description: string, title: string): string {
  const combined = `${(description || "").toLowerCase()} ${(title || "").toLowerCase()}`;
  if (combined.includes("pour femme") || combined.includes("pour fille") || combined.includes("women") || combined.includes("woman") || combined.includes(" femme")) return "femme";
  if (combined.includes("pour homme") || combined.includes("pour garçon") || combined.includes("men's") || combined.includes("for men") || combined.includes(" homme")) return "homme";
  if (combined.includes("pour enfant") || combined.includes("enfants") || combined.includes("kids") || combined.includes("junior") || combined.includes("bébé") || combined.includes("nourrisson")) return "enfant";

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

    return new Response(
      JSON.stringify({ success: true, count: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
