import { mkdir, writeFile, stat } from "node:fs/promises"
import path from "node:path"

const STORAGE_ROOT = path.join(process.cwd(), "storage")
export const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads")
export const CROPPED_DIR = path.join(STORAGE_ROOT, "cropped")
export const RESULTS_DIR = path.join(STORAGE_ROOT, "results")
export const BATCHES_DIR = path.join(STORAGE_ROOT, "batches")

async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error
    }
  }
}

export async function ensureDirExists(dirPath: string) {
  await ensureDir(dirPath)
}

export async function ensureStorageDirs() {
  await ensureDir(UPLOADS_DIR)
  await ensureDir(CROPPED_DIR)
  await ensureDir(RESULTS_DIR)
  await ensureDir(BATCHES_DIR)
}

export function getUploadPath(batchId: string, originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  return path.join(UPLOADS_DIR, `${batchId}-${safeName}`)
}

export function getProcessedImagePath(batchId: string, fileName: string) {
  return path.join(CROPPED_DIR, batchId, fileName)
}

export function getProcessedBatchDir(batchId: string) {
  return path.join(CROPPED_DIR, batchId)
}

export function getResultXlsxPath(batchId: string, fileName: string) {
  return path.join(RESULTS_DIR, `${batchId}-${fileName}`)
}

export function getBatchRecordPath(batchId: string) {
  return path.join(BATCHES_DIR, `${batchId}.json`)
}

export async function saveFile(filePath: string, buffer: Buffer) {
  await ensureDir(path.dirname(filePath))
  await writeFile(filePath, buffer)
}

export async function pathExists(filePath: string) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false
    }
    throw error
  }
}

export function getPublicProcessedUrl(batchId: string, fileName: string, baseUrl?: string) {
  const relativePath = `/processed/${batchId}/${fileName}`
  if (!baseUrl) {
    return relativePath
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  return `${normalizedBase}${relativePath}`
}
