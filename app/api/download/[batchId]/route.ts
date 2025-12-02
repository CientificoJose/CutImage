import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { getBatchRecord } from "@/lib/batch-store"
import { pathExists } from "@/lib/storage"

export async function GET(_: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params

  const record = await getBatchRecord(batchId)
  if (!record || !record.resultFilePath) {
    return NextResponse.json({ error: "Resultado no encontrado" }, { status: 404 })
  }

  const exists = await pathExists(record.resultFilePath)
  if (!exists) {
    return NextResponse.json({ error: "El archivo procesado ya no está disponible" }, { status: 410 })
  }

  const buffer = await readFile(record.resultFilePath)
  const fileName = path.basename(record.resultFilePath)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  })
}
