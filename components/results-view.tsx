"use client"

import { useMemo, useState } from "react"
import { Download, Check, FileSpreadsheet, Link, ChevronLeft, ChevronRight, Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FileData } from "@/app/page"

interface ResultsViewProps {
  data: FileData
  onReset: () => void
  onDownload: () => Promise<void>
}

export function ResultsView({ data, onReset, onDownload }: ResultsViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  const rowsPerPage = 5
  const totalPages = Math.ceil(data.rows.length / rowsPerPage)

  const processedUrlExample = useMemo(() => {
    for (const row of data.rows) {
      for (const cell of row) {
        if (typeof cell === "string" && /^https?:\/\//i.test(cell.trim())) {
          return cell
        }
      }
    }
    return "URL procesada disponible después del primer lote"
  }, [data.rows])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al descargar el archivo"
      alert(message)
    } finally {
      setIsDownloading(false)
    }
  }

  const paginatedRows = data.rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Success Banner */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-lg animate-pulse" />
              <div className="relative p-3 bg-primary/20 rounded-full border border-primary/30">
                <Check className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Procesamiento completado</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">¡Tus imágenes están listas!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Se procesaron {data.rows.length} imágenes exitosamente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onReset}
              className="gap-2 border-border/50 hover:border-primary/50 flex-1 sm:flex-initial bg-transparent"
            >
              <RotateCcw className="w-4 h-4" />
              Nuevo
            </Button>
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 flex-1 sm:flex-initial"
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Descargar XLSX
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">Archivo procesado</h3>
        <div className="flex items-center gap-3 text-muted-foreground">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span className="text-sm">{data.fileName}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Listo para descargar</Badge>
        </div>
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
                      {column.toLowerCase().includes("url") && (
                        <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0">NUEVO</Badge>
                      )}
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
                          ? "text-primary font-mono text-xs max-w-[200px] truncate"
                          : "text-foreground"
                      }`}
                      title={cell}
                    >
                      {data.columns[cellIndex].toLowerCase().includes("url") ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
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

      {/* Comparison Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-muted/20 border-border/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm font-medium text-muted-foreground">URLs originales</span>
          </div>
          <code className="text-xs text-accent font-mono block truncate">
            https://images.example.com/laptop-pro-x1.jpg
          </code>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm font-medium text-primary">URLs procesadas</span>
          </div>
          <code className="text-xs text-primary font-mono block truncate" title={processedUrlExample}>
            {processedUrlExample}
          </code>
        </Card>
      </div>
    </div>
  )
}
