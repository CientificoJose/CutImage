import { readdir, stat, rm } from "node:fs/promises"
import path from "node:path"

import { CROPPED_DIR, RESULTS_DIR } from "@/lib/storage"

const MAX_AGE_HOURS = parseInt(process.env.CLEANUP_MAX_HOURS ?? "48", 10)
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000

async function deleteOldFilesFromDir(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  const now = Date.now()

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await deleteOldFilesFromDir(entryPath)
      continue
    }

    const stats = await stat(entryPath)
    if (now - stats.mtimeMs > MAX_AGE_MS) {
      await rm(entryPath)
      console.log(`Eliminado: ${entryPath}`)
    }
  }
}

async function main() {
  await Promise.all([deleteOldFilesFromDir(CROPPED_DIR), deleteOldFilesFromDir(RESULTS_DIR)])
}

main().catch((error) => {
  console.error("Error al limpiar archivos antiguos", error)
  process.exit(1)
})
