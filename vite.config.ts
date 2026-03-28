import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

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
    mode === "development" && componentTagger(),
    buildMetaPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
