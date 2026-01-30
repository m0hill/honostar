import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, type Plugin } from "vite"

function emitPublicFileAsAsset(args: { src: string; fileName: string }): Plugin {
  return {
    name: `honostar:emit:${args.fileName}`,
    apply: "build",
    generateBundle() {
      const source = readFileSync(resolve(__dirname, args.src), "utf-8")
      this.emitFile({ type: "asset", fileName: args.fileName, source })
    },
  }
}

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        runtime: resolve(__dirname, "src/client.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/chunks/[name]-[hash].js",
        assetFileNames: "assets/static/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    emitPublicFileAsAsset({ src: "public/datastar.js", fileName: "assets/datastar.js" }),
    emitPublicFileAsAsset({ src: "public/styles.css", fileName: "assets/styles.css" }),
  ],
})
