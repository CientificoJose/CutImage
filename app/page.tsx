"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { FileUploader } from "@/components/file-uploader"
import { DataPreview } from "@/components/data-preview"
import { ResultsView } from "@/components/results-view"

export type AppState = "upload" | "preview" | "results"

export interface FileData {
  fileName: string
  columns: string[]
  rows: string[][]
}

interface BatchError {
  row: number
  column?: number
  message: string
}

interface BatchStatusPayload {
  id: string
  status: string
  processedRows: number
  totalRows: number
  errors: BatchError[]
  resultFilePath?: string
  processedPreviewRows?: string[][]
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("upload")
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [resultsData, setResultsData] = useState<FileData | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [batchStatus, setBatchStatus] = useState<BatchStatusPayload | null>(null)
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStatusPolling = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(
    async (currentBatchId: string) => {
      try {
        const response = await fetch(`/api/status/${currentBatchId}`)
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as { batch: BatchStatusPayload }
        setBatchStatus(payload.batch)
        if (payload.batch.status === "completed" || payload.batch.status === "failed") {
          stopStatusPolling()
        }
      } catch (error) {
        console.error("Error al consultar el estado", error)
      }
    },
    [stopStatusPolling],
  )

  const startStatusPolling = useCallback(
    (currentBatchId: string) => {
      stopStatusPolling()
      fetchStatus(currentBatchId)
      const id = setInterval(() => {
        fetchStatus(currentBatchId)
      }, 3000)
      statusIntervalRef.current = id
    },
    [fetchStatus, stopStatusPolling],
  )

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null)
      setProcessError(null)
      setIsProcessing(false)
      stopStatusPolling()
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null)
          throw new Error(errorPayload?.error ?? "No se pudo procesar el archivo")
        }

        const data = (await response.json()) as {
          batchId: string
          preview: FileData
          totalRows: number
        }

        setBatchId(data.batchId)
        setFileData(data.preview)
        setResultsData(null)
        setBatchStatus({
          id: data.batchId,
          status: "uploaded",
          processedRows: 0,
          totalRows: data.totalRows,
          errors: [],
        })
        setAppState("preview")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido al subir el archivo"
        setUploadError(message)
      }
    },
    [],
  )

  const handleProcess = useCallback(async () => {
    if (!batchId) {
      setProcessError("No se encontró el batch actual")
      return
    }
    setIsProcessing(true)
    setProcessError(null)
    startStatusPolling(batchId)
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "No se pudo procesar el batch")
      }

      const data = (await response.json()) as { result: FileData; errors: BatchError[] }

      setResultsData(data.result)
      setAppState("results")
      setBatchStatus((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              processedRows: data.result.rows.length,
              errors: data.errors ?? prev.errors,
              totalRows: prev.totalRows ?? data.result.rows.length,
            }
          : prev,
      )
      await fetchStatus(batchId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al procesar"
      setProcessError(message)
      await fetchStatus(batchId)
    } finally {
      setIsProcessing(false)
    }
  }, [batchId, fetchStatus, startStatusPolling])

  const handleDownload = useCallback(async () => {
    if (!batchId) {
      throw new Error("No hay batch disponible para descargar")
    }

    const response = await fetch(`/api/download/${batchId}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error ?? "No se pudo descargar el archivo procesado")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = resultsData?.fileName ?? "cutimage.xlsx"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }, [batchId, resultsData])

  const handleReset = () => {
    setAppState("upload")
    setFileData(null)
    setResultsData(null)
    setBatchId(null)
    setUploadError(null)
    setProcessError(null)
    setIsProcessing(false)
    setBatchStatus(null)
    stopStatusPolling()
  }

  useEffect(() => {
    return () => {
      stopStatusPolling()
    }
  }, [stopStatusPolling])

  const progressInfo = batchStatus
    ? {
        status: batchStatus.status,
        processedRows: batchStatus.processedRows,
        totalRows: batchStatus.totalRows,
        errorCount: batchStatus.errors?.length ?? 0,
        errors: batchStatus.errors ?? [],
      }
    : undefined

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <Header onReset={handleReset} showReset={appState !== "upload"} />

        <div className="container mx-auto px-4 py-8 md:py-12">
          {appState === "upload" && <FileUploader onFileUpload={handleFileUpload} errorMessage={uploadError} />}

          {appState === "preview" && fileData && (
            <DataPreview
              data={fileData}
              onProcess={handleProcess}
              onBack={() => setAppState("upload")}
              isProcessing={isProcessing}
              processError={processError}
              progress={progressInfo}
            />
          )}

          {appState === "results" && resultsData && (
            <ResultsView data={resultsData} onReset={handleReset} onDownload={handleDownload} />
          )}
        </div>
      </div>
    </main>
  )
}
