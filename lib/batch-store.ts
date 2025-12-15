import { readFile, writeFile } from "node:fs/promises"
import { getBatchRecordPath, ensureStorageDirs } from "./storage"

export type BatchStatus = "uploaded" | "processing" | "completed" | "failed"

export interface BatchError {
  row: number
  column?: number
  message: string
}

export interface BatchRecord {
  id: string
  status: BatchStatus
  originalFileName: string
  uploadPath: string
  resultFilePath?: string
  columns: string[]
  totalRows: number
  urlColumnIndexes: number[]
  tituloColumnIndex: number | null
  skuColumnIndex: number | null
  processedRows: number
  createdAt: string
  updatedAt: string
  errors: BatchError[]
  processedPreviewRows?: string[][]
  baseUrl?: string
}

export interface CreateBatchRecordInput {
  id: string
  originalFileName: string
  uploadPath: string
  columns: string[]
  totalRows: number
  urlColumnIndexes: number[]
  tituloColumnIndex: number | null
  skuColumnIndex: number | null
  baseUrl?: string
}

export async function createBatchRecord(input: CreateBatchRecordInput) {
  await ensureStorageDirs()
  const now = new Date().toISOString()
  const record: BatchRecord = {
    id: input.id,
    status: "uploaded",
    originalFileName: input.originalFileName,
    uploadPath: input.uploadPath,
    columns: input.columns,
    totalRows: input.totalRows,
    urlColumnIndexes: input.urlColumnIndexes,
    tituloColumnIndex: input.tituloColumnIndex,
    skuColumnIndex: input.skuColumnIndex,
    processedRows: 0,
    createdAt: now,
    updatedAt: now,
    errors: [],
    processedPreviewRows: undefined,
    baseUrl: input.baseUrl,
  }

  await writeFile(getBatchRecordPath(input.id), JSON.stringify(record, null, 2), "utf-8")
  return record
}

export async function getBatchRecord(batchId: string) {
  try {
    const contents = await readFile(getBatchRecordPath(batchId), "utf-8")
    return JSON.parse(contents) as BatchRecord
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

export async function updateBatchRecord(
  batchId: string,
  mutator: (record: BatchRecord) => BatchRecord,
) {
  const record = await getBatchRecord(batchId)
  if (!record) {
    throw new Error(`Batch ${batchId} no encontrado`)
  }

  const updated = mutator(record)
  updated.updatedAt = new Date().toISOString()
  await writeFile(getBatchRecordPath(batchId), JSON.stringify(updated, null, 2), "utf-8")
  return updated
}
