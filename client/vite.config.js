import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

const require = createRequire(import.meta.url);
const cesiumRoot = path.dirname(require.resolve("cesium/package.json"));
const cesiumBuildRootPath = path.join(cesiumRoot, "Build");

export default defineConfig({
  plugins: [
    react(),
    cesium({
      cesiumBuildRootPath,
      cesiumBuildPath: path.join(cesiumBuildRootPath, "Cesium") + path.sep,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
