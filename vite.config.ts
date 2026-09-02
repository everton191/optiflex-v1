import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Opticore",
        short_name: "Opticore",
        description: "Gestão óptica offline-first.",
        theme_color: "#123145",
        background_color: "#f7fafb",
        display: "standalone",
        icons: [{ src: "/icons/opticore.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      }
    })
  ]
});
