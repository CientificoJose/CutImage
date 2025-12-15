import { NextResponse } from "next/server"
import { v4 as uuid } from "uuid"

import { parseXlsx } from "@/lib/xlsx"
import { ensureStorageDirs, getUploadPath, saveFile } from "@/lib/storage"
import { createBatchRecord } from "@/lib/batch-store"

const PREVIEW_ROW_LIMIT = 20

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function resolveBaseUrl(request: Request) {
  const origin = request.headers.get("origin")
  if (origin) {
    return origin
  }
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http"
  const forwardedHost = request.headers.get("x-forwarded-host")
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  const host = request.headers.get("host")
  if (host) {
    return `${forwardedProto}://${host}`
  }
  return undefined
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo XLSX requerido" }, { status: 400 })
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "El archivo debe ser .xlsx" }, { status: 400 })
    }

    const buffer = await fileToBuffer(file)
    const batchId = uuid()

    await ensureStorageDirs()
    const uploadPath = getUploadPath(batchId, file.name)
    await saveFile(uploadPath, buffer)

    const parsed = await parseXlsx(buffer)

    await createBatchRecord({
      id: batchId,
      originalFileName: file.name,
      uploadPath,
      columns: parsed.columns,
      totalRows: parsed.rows.length,
      urlColumnIndexes: parsed.urlColumnIndexes,
      tituloColumnIndex: parsed.tituloColumnIndex,
      skuColumnIndex: parsed.skuColumnIndex,
      baseUrl: resolveBaseUrl(request),
    })

    return NextResponse.json({
      batchId,
      preview: {
        fileName: file.name,
        columns: parsed.columns,
        rows: parsed.rows.slice(0, PREVIEW_ROW_LIMIT),
      },
      totalRows: parsed.rows.length,
    })
  } catch (error) {
    console.error("Error al subir XLSX", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno al procesar el archivo" },
      { status: 500 },
    )
  }
}
