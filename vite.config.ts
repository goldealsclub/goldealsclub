import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import fs from "fs";


// Config Supabase publique récupérée au build (scripts/fetch-public-config.mjs) : elle
// prime sur d'éventuelles variables Vercel restées sur un ancien projet.
try {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, ".supabase-public.json"), "utf8"));
  if (cfg?.url && cfg?.anonKey) {
    process.env.VITE_SUPABASE_URL = cfg.url;
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = cfg.anonKey;
    process.env.VITE_SUPABASE_PROJECT_ID = cfg.projectRef || "";
  }
} catch {
  /* pas de config publique : variables d'environnement et .env habituels */
}

function buildMetaPlugin(): Plugin {
  return {
    name: "build-meta",
    writeBundle() {
      const meta = JSON.stringify({ version: new Date().toISOString() });
      fs.writeFileSync(path.resolve(__dirname, "dist/build-meta.json"), meta);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mcpPlugin(),
    buildMetaPlugin(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
