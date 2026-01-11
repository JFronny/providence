import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    basicSsl(),
    tsconfigPaths(),
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
  // esbuild: {
  //   jsxFactory: "JSX.createElement",
  //   jsxFragment: "HTMLElement",
  // },
});
