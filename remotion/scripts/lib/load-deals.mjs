// Charge les deals DU JOUR pour les vidéos.
// Ordre : fonction live deals-json → snapshot quotidien (Storage CDN) → public/deals.json (figé, dernier recours).
// Avant : public/deals.json était lu en priorité, or ce fichier est figé dans le dépôt
// (avril 2026) → promos expirées, images mortes, rendu en échec.
import fs from "fs";

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.deals || []);

async function tryFetch(label, url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`   ⚠️  ${label} : HTTP ${res.status}`);
      return null;
    }
    const list = asList(await res.json());
    if (list.length === 0) {
      console.warn(`   ⚠️  ${label} : vide`);
      return null;
    }
    console.log(`📡 ${list.length} deals chargés depuis ${label}`);
    return list;
  } catch (e) {
    console.warn(`   ⚠️  ${label} : ${e.message}`);
    return null;
  }
}

export async function loadDeals({ supabaseUrl, supabaseKey, localPath }) {
  if (supabaseUrl) {
    // 1. Fonction live (toujours à jour). Le snapshot quotidien peut être figé :
    //    le 07/10/2026 il datait du 02/10 (job snapshot en échec, deals-json HTTP 500
    //    pendant l'import Awin de 06:00 UTC).
    if (supabaseKey) {
      const live = await tryFetch("fonction deals-json", `${supabaseUrl}/functions/v1/deals-json`, {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      });
      if (live) return live;
    }

    // 2. Snapshot quotidien (CDN) en secours.
    const snapshot = await tryFetch(
      "snapshot quotidien",
      `${supabaseUrl}/storage/v1/object/public/deals-snapshots/all.json`,
    );
    if (snapshot) return snapshot;
  }

  if (localPath && fs.existsSync(localPath)) {
    const ageDays = Math.round((Date.now() - fs.statSync(localPath).mtimeMs) / 86400000);
    console.warn(`📂 Repli sur ${localPath} (fichier figé, ~${ageDays} j) — les images peuvent être expirées`);
    return asList(JSON.parse(fs.readFileSync(localPath, "utf-8")));
  }

  console.error("❌ Impossible de charger les deals (snapshot, deals-json et fichier local indisponibles)");
  process.exit(1);
}
