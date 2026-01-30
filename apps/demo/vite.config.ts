import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
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
        plugins: resolve(__dirname, "src/lib/plugins/index.ts"),
        styles: resolve(__dirname, "styles.css"),
      },
    },
  },
  plugins: [tailwindcss()],
})
