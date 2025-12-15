import ExcelJS from "exceljs"

export interface ParsedXlsxData {
  columns: string[]
  rows: string[][]
  urlColumnIndexes: number[]
  tituloColumnIndex: number | null
  skuColumnIndex: number | null
}

const MAX_COLUMNS = 15

function sanitizeCellValue(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number") return value.toString()
  if (typeof value === "boolean") return value ? "true" : "false"
  return `${value}`
}

const URL_HEADER_KEYWORDS = ["url", "imagen", "image", "foto", "img"]
const TITULO_KEYWORDS = ["titulo", "título", "title", "nombre", "name"]
const SKU_KEYWORDS = ["sku", "código", "codigo", "code", "id", "ref", "referencia"]

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function detectUrlColumns(columns: string[], rows: string[][]) {
  const indexes = new Set<number>()

  columns.forEach((column, idx) => {
    const lower = column.toLowerCase()
    if (URL_HEADER_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      indexes.add(idx)
    }
  })

  if (indexes.size === 0 && rows.length > 0) {
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
      const hasUrlValue = rows.some((row) => isLikelyUrl(row[columnIndex] ?? ""))
      if (hasUrlValue) {
        indexes.add(columnIndex)
      }
    }
  }

  return Array.from(indexes)
}

function detectSpecialColumn(columns: string[], keywords: string[]): number | null {
  for (let idx = 0; idx < columns.length; idx++) {
    const lower = columns[idx].toLowerCase()
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return idx
    }
  }
  return null
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedXlsxData> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error("El XLSX no contiene hojas")
  }

  const headerRow = worksheet.getRow(1)
  const columnCount = headerRow.cellCount
  if (columnCount === 0) {
    throw new Error("El XLSX debe contener al menos una columna")
  }
  if (columnCount > MAX_COLUMNS) {
    throw new Error(`El XLSX no puede tener más de ${MAX_COLUMNS} columnas`)
  }

  const columns: string[] = []
  for (let i = 1; i <= columnCount; i++) {
    const cellValue = sanitizeCellValue(headerRow.getCell(i).text)
    columns.push(cellValue || `Columna ${i}`)
  }

  const rows: string[][] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return

    const values: string[] = []
    for (let i = 1; i <= columnCount; i++) {
      const cellValue = sanitizeCellValue(row.getCell(i).text)
      values.push(cellValue)
    }

    if (values.some((value) => value.length > 0)) {
      rows.push(values)
    }
  })

  if (rows.length === 0) {
    throw new Error("El archivo no contiene filas de datos")
  }

  const urlColumnIndexes = detectUrlColumns(columns, rows)
  if (urlColumnIndexes.length === 0) {
    throw new Error("No se detectaron columnas de URLs. Renombra las columnas para incluir 'URL'.")
  }

  const tituloColumnIndex = detectSpecialColumn(columns, TITULO_KEYWORDS)
  const skuColumnIndex = detectSpecialColumn(columns, SKU_KEYWORDS)

  return {
    columns,
    rows,
    urlColumnIndexes,
    tituloColumnIndex,
    skuColumnIndex,
  }
}
