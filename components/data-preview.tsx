"use client"

import { useState } from "react"
import { ArrowLeft, Play, FileSpreadsheet, Link, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FileData } from "@/app/page"

interface DataPreviewProps {
  data: FileData
  onProcess: () => void
  onBack: () => void
  isProcessing?: boolean
  processError?: string | null
  progress?: {
    status: string
    processedRows: number
    totalRows: number
    errorCount: number
  }
}

export function DataPreview({ data, onProcess, onBack, isProcessing, processError, progress }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 5
  const totalPages = Math.ceil(data.rows.length / rowsPerPage)

  const paginatedRows = data.rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Vista previa del archivo</h2>
          <div className="flex items-center gap-3 text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="text-sm">{data.fileName}</span>
            <Badge variant="secondary" className="text-xs">
              {data.columns.length} columnas
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {data.rows.length} filas
            </Badge>
          </div>
        </div>

        <Button
          size="lg"
          onClick={onProcess}
          disabled={isProcessing}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 w-full sm:w-auto"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Procesar imágenes
            </>
          )}
        </Button>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                {data.columns.map((column, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      {column.toLowerCase().includes("url") && <Link className="w-3 h-3 text-primary" />}
                      {column}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-3 text-sm whitespace-nowrap ${
                        data.columns[cellIndex].toLowerCase().includes("url")
                          ? "text-accent font-mono text-xs max-w-[200px] truncate"
                          : "text-foreground"
                      }`}
                      title={cell}
                    >
                      {data.columns[cellIndex].toLowerCase().includes("url") ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          <span className="truncate max-w-[180px]">{cell}</span>
                        </div>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-muted/10">
          <p className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, data.rows.length)} de{" "}
            {data.rows.length} filas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-border/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-border/50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {(processError || progress) && (
        <Card className="p-4 bg-muted/10 border-border/40">
          <div className="flex flex-col gap-3">
            {progress && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado actual</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{progress.status}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Progreso: {progress.processedRows} / {progress.totalRows}
                </div>
                <div className="text-sm text-muted-foreground">Errores: {progress.errorCount}</div>
              </div>
            )}

            {processError && (
              <div className="flex items-start gap-3 text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <p className="text-sm">{processError}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Link className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">URLs de imágenes detectadas</h4>
            <p className="text-sm text-muted-foreground">
              Se encontraron URLs de imágenes en la columna &ldquo;Imagen URL&rdquo;. Al procesar, estas URLs serán
              reemplazadas por las nuevas URLs de las imágenes recortadas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
