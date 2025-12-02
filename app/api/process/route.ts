import { NextResponse } from "next/server"

import { getBatchRecord } from "@/lib/batch-store"
import { processBatch } from "@/lib/batch-processor"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const batchId = body?.batchId as string | undefined

    if (!batchId) {
      return NextResponse.json({ error: "batchId es requerido" }, { status: 400 })
    }

    const record = await getBatchRecord(batchId)
    if (!record) {
      return NextResponse.json({ error: "Batch no encontrado" }, { status: 404 })
    }

    if (record.status === "processing") {
      return NextResponse.json({ error: "El batch ya se está procesando" }, { status: 409 })
    }

    const result = await processBatch(batchId)

    return NextResponse.json({
      result: result.fileData,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Error al procesar batch", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno al procesar las imágenes" },
      { status: 500 },
    )
  }
}
