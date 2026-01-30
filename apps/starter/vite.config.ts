import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    manifest: "manifest.json",
    rollupOptions: {
      input: {
        runtime: resolve(__dirname, "src/client.ts"),
        styles: resolve(__dirname, "styles.css"),
      },
    },
  },
})
