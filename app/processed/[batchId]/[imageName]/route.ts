import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { getProcessedImagePath, pathExists } from "@/lib/storage"

function getContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".gif":
      return "image/gif"
    default:
      return "application/octet-stream"
  }
}

export async function GET(
  _: Request,
  context: { params: Promise<{ batchId: string; imageName: string }> },
) {
  const { batchId, imageName } = await context.params

  const filePath = getProcessedImagePath(batchId, imageName)
  const exists = await pathExists(filePath)
  if (!exists) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
  }

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": getContentType(imageName),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
