import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      pwaAssets: {},
      manifest: {
        name: "Providence",
        short_name: "Providence",
      },
    }),
  ],
  base: "/",
  resolve: {
    tsconfigPaths: true,
  },
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "src/jsx",
    },
  },
});
