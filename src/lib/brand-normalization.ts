const CANONICAL_BRANDS: Record<string, string> = {
  nike: "Nike",
  adidas: "adidas",
  jordan: "Jordan",
  ugg: "UGG",
  asics: "ASICS",
  puma: "PUMA",
  converse: "Converse",
  vans: "Vans",
  pegador: "Pegador",
  dickies: "Dickies",
  lacoste: "Lacoste",
  timberland: "Timberland",
  on: "On",
  prohibited: "Prohibited",
  halo: "HALO",
  salomon: "Salomon",
  reebok: "Reebok",
  fila: "Fila",
  casio: "Casio",
  carhartt: "Carhartt",
  champion: "Champion",
  ellesse: "Ellesse",
  kappa: "Kappa",
  starter: "Starter",
  columbia: "Columbia",
  "levi's": "Levi's",
  stance: "Stance",
  oakley: "Oakley",
  tommy: "Tommy",
  birkenstock: "Birkenstock",
  saucony: "Saucony",
  crocs: "Crocs",
  merrell: "Merrell",
  clarks: "Clarks",
  hoka: "Hoka",
  stanley: "Stanley",
  "2y": "2Y",
  small: "Small",
  dc: "DC",
  buffalo: "Buffalo",
  decibel: "Decibel",
  eastpak: "Eastpak",
  umbro: "Umbro",
  snipes: "Snipes",
  "new balance": "New Balance",
  "new era": "New Era",
  "karl kani": "Karl Kani",
  "polo ralph lauren": "Polo Ralph Lauren",
  "polo sport": "Polo Sport",
  "dr. martens": "Dr. Martens",
  "under armour": "Under Armour",
  "smoke rise": "Smoke Rise",
  "sergio tacchini": "Sergio Tacchini",
  "true religion": "True Religion",
  "von dutch": "Von Dutch",
  "mitchell & ness": "Mitchell & Ness",
  "g-shock": "G-SHOCK",
  "another cotton": "Another Cotton",
  "nike sb": "Nike SB",
  "the north face": "The North Face",
  "2y studios": "2Y Studios",
  "47 brand": "47 Brand",
  givova: "Givova",
  macron: "Macron",
  hummel: "Hummel",
  joma: "Joma",
  errea: "Errea",
  "erreà": "Errea",
  kelme: "Kelme",
  lotto: "Lotto",
  mizuno: "Mizuno",
  diadora: "Diadora",
  "le coq sportif": "Le Coq Sportif",
  jako: "Jako",
  uhlsport: "Uhlsport",
  patrick: "Patrick",
};

const MULTI_WORD_BRANDS = [
  "Low Lights Studios",
  "New Balance",
  "New Era",
  "Karl Kani",
  "Polo Ralph Lauren",
  "Polo Sport",
  "Dr. Martens",
  "Under Armour",
  "Smoke Rise",
  "Sergio Tacchini",
  "True Religion",
  "Von Dutch",
  "Mitchell & Ness",
  "G-SHOCK",
  "Another Cotton",
  "Nike SB",
  "The North Face",
  "2Y Studios",
  "47 Brand",
];

const SINGLE_WORD_BRANDS = new Set([
  "Nike",
  "adidas",
  "Jordan",
  "UGG",
  "ASICS",
  "PUMA",
  "Converse",
  "Vans",
  "Pegador",
  "Dickies",
  "Lacoste",
  "Timberland",
  "On",
  "Prohibited",
  "HALO",
  "Salomon",
  "Reebok",
  "Fila",
  "Casio",
  "Carhartt",
  "Champion",
  "Ellesse",
  "Kappa",
  "Starter",
  "Columbia",
  "Levi's",
  "Stance",
  "Oakley",
  "Tommy",
  "Birkenstock",
  "Saucony",
  "Crocs",
  "Merrell",
  "Clarks",
  "Hoka",
  "Stanley",
  "2Y",
  "Small",
  "DC",
  "Buffalo",
  "Decibel",
  "Eastpak",
  "Umbro",
  "Snipes",
  "Givova",
  "Macron",
  "Hummel",
  "Joma",
  "Errea",
  "Kelme",
  "Lotto",
  "Mizuno",
  "Diadora",
  "Jako",
  "Uhlsport",
  "Patrick",
]);

const KEYWORD_BRANDS: [string[], string][] = [
  [["air jordan", "jumpman", "jordan ", "jdb ", "jdg ", "j brkln", "j flight", "jordan los", "jordan post", "jordan 1", "jordan 4", "jordan 5", "jordan 11", "jordan mvp", "jordan remix", "jordan sky", "jordan essentials", "jordan brooklyn", "j brooklyn", "mj brooklyn", "jdg brooklyn", "wj brooklyn", "jdb brooklyn", "spizike low", "flight fleece", "flight mvp", "flight essentials", "flight washed", "flight barrel", "flight graphics", "flight chicago", "brooklyn fleece", "brooklyn motorsport", "brooklyn flannel", "brooklyn essential", "brooklyn t-shirt"], "Jordan"],
  [["air max", "air force", "air zoom", "air huarache", "sportswear", "dri-fit", "dri fit", "tech fleece", "acg ", "wmns ", "nsw ", "sb force", "sb chron", "sb dunk", "nike blazer", "cortez", "pegasus", "vomero", "shox ", "total 90", "windrunner", "tech woven", "one dri-fit", "dunk low", "dunk high", "m nk ", "w nk ", "b nk ", "force 1 ", "p-6000", "waffle one", "react ", "flyknit", "air rift", "huarache", "indy bra", "swoosh", "renew", "downshifter", "revolution ", "wearallday", "crater impact", "presto ", "killshot", "tailwind", "structure ", "zoom fly", "vapormax", "invincible", "panda retro", "nk df ", "nk dry", "nk club", "tech pack", "everyday max", "everyday plus", "everyday cotton stretch", "m nsw", "w nsw", "nsw essential", "nsw club", "nike "], "Nike"],
  [["superstar", "adicolor", "firebird", "ozweego", "forum ", "campus ", "gazelle", "samba", "stan smith", "nmd ", "yeezy", "ultraboost", "spezial", "adilette", "zx ", "la franc", "taekwondo", "italia 70s", "spiritain", "spiritian", "galaxy og", "dame x ", "spacer cutline", "sl 72", "climacool", "teamgeist", "adistar", "megaride", "predator", "rivalry ", "handball spezial", "marathon ", "response ", "busenitz", "3-streifen", "3-stripes", "trefoil", "adibreak", "3 stripes", "adiletten", "sambae", "handball ", "badlander", "adi2000", "adifom", "ozelia", "retropy", "country og", "sl72", "centennial", "adi ", "adicolour"], "adidas"],
  [["fresh foam", "fuelcell", "2002r", "2002 ", "574 ", "990 ", "327 ", "1906", "9060", "740 ", "530 ", "1000 ", "204 ", "550 ", "480 ", "1080", "860 ", "linear heritage", "nb essentials", "sport essentials", "athletics remastered", "numeric ", "made in usa", "made in uk", "hoops "], "New Balance"],
  [["speedcat", "mostro", "suede xl", "suede ", "cali ", "fenty", "avanti ", "rs-x", "rs x", "mayze", "ca pro", "fade nitro", "halo runner", "puma ", "palermo ", "clyde ", "blaze of glory", "mb.", "lamelo", "disc ", "rider ", "mirage", "future rider", "wild rider", "trinity "], "PUMA"],
  [["gel-", "gel ", "tiger runner", "lyte classic", "japan w ", "tokyo w ", "gt-2160", "gt-1000", "gt-2000", "kayano", "nimbus", "cumulus", "noosa"], "ASICS"],
  [["chuck taylor", "chuck 70", "pro blaze", "puff taylor", "puff player", "all star", "one star", "weapon ", "cons "], "Converse"],
  [["classic mini", "tazz", "disquette", "lowmel", "funkette", "tazzelle", "tasman", "classic ultra", "dipper", "classic micro", "pipah ", "goldenstar", "cora sand", "scuffette"], "UGG"],
  [["old skool", "sk8-", "knu skool", "era ", "authentic ", "slip-on", "ultrarange", "rowley classic", "lowland"], "Vans"],
  [["classic nylon", "club c ", "cardi slide", "question ", "answer ", "nano x", "classic leather", "workout plus", "instapump", "pump fury", "bb 4000"], "Reebok"],
  [["acs+", "acs +", "xt-6", "xt-whisper", "speedcross", "xt-4", "acs pro", "rx moc"], "Salomon"],
  [["cloud 6", "cloudtilt", "cloudsurfer", "cloudvista", "cloudnova", "cloudmonster", "cloudswift", "cloudzone", "roger pro", "the roger"], "On"],
  [["clifton", "bondi ", "arahi", "motion 6", "mafate", "speedgoat", "rincon", "mach "], "Hoka"],
  [["t-clip", "l003 ", "croco ", "carnaby", "chaymon", "lerond", "powercourt", "run spin", "l spin", "l004"], "Lacoste"],
  [["quencher", "iceflow", "flowstate", "protour", "h2.o"], "Stanley"],
  [["serif logo", "pocket tee", "single knee", "chase ", "american script", "wip "], "Carhartt"],
  [["heatgear", "coldgear", "unstoppable", "hovr ", "blitzing", "ua ", "charged ", "armour fleece", "tech graphic", "rival fleece", "sportstyle"], "Under Armour"],
  [["eisenhower", "874 ", "dickies ", "flex "], "Dickies"],
  [["powerblend", "reverse weave", "rochester"], "Champion"],
  [["train 89", "masters court", "bedford", "hrt ", "polo bear", "big pony"], "Polo Ralph Lauren"],
  [["stag ", "court graffik", "infinite pro", "dc "], "DC"],
  [["9forty", "9twenty", "9fifty", "59fifty", "mvp base", "base runner", "clean up", "a frame", "5 panel", "new york yankees", "los angeles dodgers", "los angeles lakers", "chicago bulls", "brooklyn nets", "fitted cap", "cuff beanie", "curve brim", "trucker cap", "wide cuff beanie", "essential cuff"], "New Era"],
  [["sprint trekker", "euro trekker", "field trekker", "premium 6", "stone street", "hylane", "6-inch", "timberland ", "euro sprint"], "Timberland"],
  [["89 2k", "89 prm", "89 up", "89 tailor", "89 classic", "89 lxry", "89 tongue", "89 logo", "prime runner", "kani runner", "kani ", "retro "], "Karl Kani"],
  [["mlb ", "nba ", "nfl ", "collegiate script", "washed script", "poly track set", "swingman", "team logo", "varsity satin"], "Mitchell & Ness"],
  [["arizona", "boston ", "gizeh", "arizona eva", "arizona nylon"], "Birkenstock"],
  [["casio", "g-shock", "mtp-", "mrw-"], "Casio"],
  [["disruptor", "fila ray", "fila ", "grant hill"], "Fila"],
  [["ellesse", "lombardy", "torices", "prado"], "Ellesse"],
  [["columbia ", "bugaboo", "silver ridge", "newton ridge"], "Columbia"],
  [["inhale ", "citigo", "serenus", "neo run", "runner prm", "goalgetter", "goldenglow", "session ", "stadium 90", "play off", "echo ", "aura ", "pluto ", "shadow skate", "venice skate", "skate low", "command ", "club low ", "h-street", "delta ", "lxry 2k", "lxyr 2k", "hidden in plain", "far away from", "box logo", "reflective globe", "another ", "vortex knit", "union jacquard", "metal signature", "small logo", "small signature", "snipes varsity", "snipes essential", "snipes box", "french terry small", "jersey small logo", "varsity raglan", "pintuck", "sport diamond", "carson ", "bobby ", "adrik ", "in game", "coated light", "horse racer", "signar ", "peak satin", "liberty baseball", "color block & piping", "shining lights", "praying mary", "babygal", "mini sweat skirt", "heart oversized", "running wild", "everyday oxford", "college tee", "hooded-sweatshirt box", "long sleeve-sweatshirt", "og trackpants", "velvet track", "loose jersey", "woven tapered", "jersey tee", "graphics tee", "tech sport", "long sleeve full zip", "waist length full zip", "long sleeve rugby", "sport-tanktop"], "Snipes"],
];

function canonicalizeBrand(value: string): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const cleaned = normalized
    .replace(/\b(sportswear|sportstyle|originals|performance|brand)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return CANONICAL_BRANDS[normalized] || CANONICAL_BRANDS[cleaned] || null;
}

export function inferBrand(rawBrand: string, title: string): string {
  const directBrand = canonicalizeBrand(rawBrand);
  const lowerRaw = rawBrand.trim().toLowerCase();
  const lowerTitleEarly = (title || "").trim().toLowerCase();

  // Hard override: if the title clearly starts with a known sports/team brand,
  // trust the title over a possibly wrong DB brand (e.g. "Givova" mis-tagged as Nike).
  const SPORTS_TEAM_BRANDS = [
    "Givova", "Macron", "Hummel", "Joma", "Errea", "Kelme",
    "Lotto", "Mizuno", "Diadora", "Le Coq Sportif", "Jako", "Uhlsport",
    "Patrick", "Umbro", "Kappa",
  ];
  for (const brand of SPORTS_TEAM_BRANDS) {
    const b = brand.toLowerCase();
    if (lowerTitleEarly.startsWith(b + " ") || lowerTitleEarly === b) {
      return brand;
    }
  }

  // Brands that need title-based re-check because DB data may be wrong
  const RECHECK_BRANDS = new Set(["jordan", "nike"]);

  if (directBrand && lowerRaw !== "snipes" && !RECHECK_BRANDS.has(lowerRaw)) {
    return directBrand;
  }

  // For re-checked brands, try title-based detection first
  if (directBrand && RECHECK_BRANDS.has(lowerRaw)) {
    const safeTitle = (title || "").trim();
    const lowerTitle = ` ${safeTitle.toLowerCase()} `;

    // Check if title clearly belongs to another brand
    const OVERRIDE_BRANDS: [string[], string][] = [
      [["air jordan", "jordan 1", "jordan 3", "jordan 4", "jordan 5", "jordan 7", "jordan 11", "jordan mvp", "jordan eighty", "jordan trunner", "jordan remix", "jordan sky", "jordan essentials", "jordan brooklyn", "jordan post", "jordan los", "j brkln", "j flight", "jdb ", "jdg ", "j brooklyn", "mj brooklyn", "jdg brooklyn", "wj brooklyn", "jdb brooklyn", "spizike low", "flight fleece", "flight mvp", "flight essentials", "flight washed", "flight barrel", "flight graphics", "flight chicago", "brooklyn fleece", "brooklyn motorsport", "brooklyn flannel", "brooklyn essential", "brooklyn t-shirt", "jordan rm"], "Jordan"],
      [["9forty", "9twenty", "9fifty", "59fifty", "mvp base", "base runner", "clean up", "a frame", "5 panel", "fitted cap", "cuff beanie", "curve brim", "trucker cap", "wide cuff beanie", "essential cuff", "beanie league essential", "beanie ws patch"], "New Era"],
      [["mlb ", "nba ", "nfl ", "collegiate script", "washed script", "poly track set", "swingman", "team logo", "varsity satin", "hwc ", "maxed out tee", "player big face", "overlap graphic", "blaze graphic", "linear graphic", "washed graphic", "washed full zip", "black out satin", "black out collection", "classic sport player", "billboard knit", "vintage block", "tailsweeps", "pinned gold", "logo hoodie", "new york yankees", "los angeles dodgers", "los angeles lakers", "chicago bulls", "brooklyn nets"], "Mitchell & Ness"],
    ];

    for (const [keywords, brandName] of OVERRIDE_BRANDS) {
      if (keywords.some((keyword) => lowerTitle.includes(keyword))) {
        return brandName;
      }
    }

    // No override matched → keep original brand. Never let generic title
    // tokens such as "WMNS" or "Sportswear" move another canonical brand
    // into Nike; this is what polluted the Nike filter.
    return directBrand;
  }

  if (rawBrand.trim().toLowerCase() === "kappa") {
    return "Kappa";
  }

  const safeTitle = (title || "").trim();
  const lowerTitle = ` ${safeTitle.toLowerCase()} `;

  for (const brand of MULTI_WORD_BRANDS) {
    if (safeTitle.toLowerCase().startsWith(brand.toLowerCase())) {
      return brand;
    }
  }

  const firstWord = safeTitle.split(/\s+/)[0] || "";
  const firstWordBrand = canonicalizeBrand(firstWord);
  if (firstWordBrand && SINGLE_WORD_BRANDS.has(firstWordBrand)) {
    return firstWordBrand;
  }

  for (const [keywords, brandName] of KEYWORD_BRANDS) {
    if (keywords.some((keyword) => lowerTitle.includes(keyword))) {
      return brandName;
    }
  }

  return directBrand || "Snipes";
}