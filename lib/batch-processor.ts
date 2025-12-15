import { readFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

import ExcelJS from "exceljs"
import sharp from "sharp"

import { parseXlsx } from "@/lib/xlsx"
import { getBatchRecord, updateBatchRecord, type BatchError } from "@/lib/batch-store"
import { titleGenerator } from "@/lib/title-generator"
import {
  ensureDirExists,
  getProcessedBatchDir,
  getProcessedImagePath,
  getPublicProcessedUrl,
  getResultXlsxPath,
  saveFile,
} from "@/lib/storage"

const TOP_CROP_HEIGHT = 160

export interface ProcessedFileData {
  fileName: string
  columns: string[]
  rows: string[][]
}

export interface BatchProcessResult {
  fileData: ProcessedFileData
  errors: BatchError[]
  resultFilePath: string
}

export async function processBatch(batchId: string): Promise<BatchProcessResult> {
  const record = await getBatchRecord(batchId)
  if (!record) {
    throw new Error("El batch solicitado no existe")
  }

  const errors: BatchError[] = []

  await updateBatchRecord(batchId, (current) => ({
    ...current,
    status: "processing",
    processedRows: 0,
    errors: [],
  }))

  // Limpiar cache de títulos para este batch
  titleGenerator.clearCache()
  const hasTitleGeneration = record.tituloColumnIndex !== null && record.skuColumnIndex !== null

  try {
    const sourceBuffer = await readFile(record.uploadPath)
    const parsed = await parseXlsx(sourceBuffer)

    if (parsed.columns.length !== record.columns.length) {
      throw new Error("La estructura del XLSX cambió desde la carga inicial")
    }

    const processedRows = parsed.rows.map((row) => [...row])
    await ensureDirExists(getProcessedBatchDir(batchId))

    let processedCount = 0
    const totalRows = processedRows.length

    for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
      // Procesar generación de títulos si están disponibles las columnas
      if (hasTitleGeneration) {
        const tituloIdx = record.tituloColumnIndex!
        const skuIdx = record.skuColumnIndex!
        const originalTitle = processedRows[rowIndex][tituloIdx]
        const sku = processedRows[rowIndex][skuIdx]

        if (originalTitle && sku) {
          try {
            const newTitle = await generateTitleWithRetry(sku, originalTitle)
            processedRows[rowIndex][tituloIdx] = newTitle
          } catch (error) {
            errors.push({
              row: rowIndex + 2,
              column: tituloIdx + 1,
              message:
                error instanceof Error
                  ? error.message
                  : "Error al generar título con ChatGPT",
            })
          }
        }
      }

      // Procesar imágenes (URLs)
      for (const columnIndex of record.urlColumnIndexes) {
        const url = processedRows[rowIndex][columnIndex]
        if (!url) continue

        try {
          const processedUrl = await downloadCropAndStoreImage(
            url,
            batchId,
            rowIndex,
            columnIndex,
            record.baseUrl,
          )
          processedRows[rowIndex][columnIndex] = processedUrl
        } catch (error) {
          errors.push({
            row: rowIndex + 2,
            column: columnIndex + 1,
            message:
              error instanceof Error
                ? error.message
                : "Error desconocido al descargar o recortar la imagen",
          })
        }
      }

      processedCount += 1
      if (shouldUpdateProgress(processedCount, totalRows)) {
        await updateBatchRecord(batchId, (current) => ({
          ...current,
          processedRows: processedCount,
          errors: [...errors],
        }))
      }
    }

    const worksheetBuffer = await buildResultWorkbook(record.columns, processedRows)
    const resultFileName = buildResultFileName(record.originalFileName)
    const resultPath = getResultXlsxPath(batchId, resultFileName)
    await saveFile(resultPath, worksheetBuffer)

    await updateBatchRecord(batchId, (current) => ({
      ...current,
      status: "completed",
      processedRows: processedRows.length,
      resultFilePath: resultPath,
      errors,
      processedPreviewRows: processedRows.slice(0, 20),
    }))

    return {
      fileData: {
        fileName: resultFileName,
        columns: record.columns,
        rows: processedRows,
      },
      errors,
      resultFilePath: resultPath,
    }
  } catch (error) {
    await updateBatchRecord(batchId, (current) => ({
      ...current,
      status: "failed",
      errors,
    }))
    throw error
  }
}

function shouldUpdateProgress(processedCount: number, totalRows: number) {
  if (processedCount === totalRows) return true
  return processedCount % 5 === 0
}

async function downloadCropAndStoreImage(
  url: string,
  batchId: string,
  rowIndex: number,
  columnIndex: number,
  baseUrl?: string,
) {
  const imageBuffer = await downloadImage(url)
  const croppedBuffer = await cropImage(imageBuffer)
  const fileName = `${rowIndex + 1}-${columnIndex + 1}-${randomUUID()}.jpg`
  const processedPath = getProcessedImagePath(batchId, fileName)
  await saveFile(processedPath, croppedBuffer)
  return getPublicProcessedUrl(batchId, fileName, baseUrl)
}

async function downloadImage(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (HTTP ${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function cropImage(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudo leer la información de la imagen")
  }
  if (metadata.height <= TOP_CROP_HEIGHT) {
    throw new Error(`La imagen es menor o igual a ${TOP_CROP_HEIGHT}px de alto`)
  }

  const croppedHeight = metadata.height - TOP_CROP_HEIGHT
  const croppedBuffer = await sharp(buffer)
    .extract({ left: 0, top: TOP_CROP_HEIGHT, width: metadata.width, height: croppedHeight })
    .jpeg({ quality: 90 })
    .toBuffer()

  return croppedBuffer
}

async function buildResultWorkbook(columns: string[], rows: string[][]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("CutImage")
  worksheet.addRow(columns)
  rows.forEach((row) => worksheet.addRow(row))
  const arrayBuffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
  return Buffer.from(arrayBuffer)
}

function buildResultFileName(originalFileName: string) {
  const ext = path.extname(originalFileName) || ".xlsx"
  const withoutExt = originalFileName.replace(new RegExp(`${ext}$`), "")
  return `${withoutExt}_cutimage${ext}`
}

async function generateTitleWithRetry(sku: string, originalTitle: string, maxRetries = 2): Promise<string> {
  let lastError: Error | null = null
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await titleGenerator.generateUniqueTitle(sku, originalTitle)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // Esperar un poco antes de reintentar (backoff exponencial)
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
  
  throw lastError ?? new Error("Error desconocido al generar título")
}
