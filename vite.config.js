import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "Treino Guiado",
        short_name: "Treino",
        description: "Controle de treinos, exercícios com GIF e evolução.",
        theme_color: "#0B1220",
        background_color: "#0B1220",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
