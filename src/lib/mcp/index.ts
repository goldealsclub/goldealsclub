import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchDeals from "./tools/search-deals";
import getDeal from "./tools/get-deal";
import listFavorites from "./tools/list-favorites";
import addFavorite from "./tools/add-favorite";
import removeFavorite from "./tools/remove-favorite";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "goldeals-club-mcp",
  title: "GOLDEALS CLUB",
  version: "0.1.0",
  instructions:
    "Tools for GOLDEALS CLUB, a curated catalogue of fashion, streetwear and sneaker deals. Use `search_deals` to find current deals by brand, category, gender, merchant, price or discount, `get_deal` for full details and the purchase link, and `list_favorites` / `add_favorite` / `remove_favorite` to manage the signed-in user's saved deals.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchDeals, getDeal, listFavorites, addFavorite, removeFavorite],
});
