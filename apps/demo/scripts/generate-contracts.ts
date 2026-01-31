#!/usr/bin/env node
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { generateContractsTypes } from "@honostar/core/server/node"

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))

async function main() {
  await generateContractsTypes({
    contractsImportPath: "../lib/contracts",
    outPath: resolve(appRoot, "src/generated/contracts.ts"),
    serverImportPath: "@honostar/core/server",
  })

  console.log("✓ Generated src/generated/contracts.ts")
}

main().catch((error) => {
  console.error("Failed to generate contracts types:", error)
  process.exit(1)
})
