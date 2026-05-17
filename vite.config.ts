import { resolve } from "path";

import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "404": resolve(__dirname, "404.html"),
      },
    },
  },
  appType: "mpa", // This is a SPA, but we do this ourself
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
