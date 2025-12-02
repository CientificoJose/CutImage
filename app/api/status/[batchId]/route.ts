import { NextResponse } from "next/server"

import { getBatchRecord } from "@/lib/batch-store"

export async function GET(_: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params

  const record = await getBatchRecord(batchId)
  if (!record) {
    return NextResponse.json({ error: "Batch no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    batch: record,
  })
}
