"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploaderProps {
  onFileUpload: (file: File) => Promise<void>
  errorMessage?: string | null
}

export function FileUploader({ onFileUpload, errorMessage }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".xlsx")) {
        setIsLoading(true)
        try {
          await onFileUpload(file)
        } finally {
          setIsLoading(false)
        }
      }
    },
    [onFileUpload],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setIsLoading(true)
        try {
          await onFileUpload(file)
        } finally {
          setIsLoading(false)
        }
      }
    },
    [onFileUpload],
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8 md:py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Herramienta profesional
        </div>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
          Procesa tus imágenes
          <br />
          <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
            en segundos
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          Carga tu archivo XLSX con URLs de imágenes y obtén un nuevo archivo con las imágenes procesadas y recortadas
          automáticamente.
        </p>
      </div>

      {/* Upload Card */}
      <Card
        className={`relative overflow-hidden border-2 border-dashed transition-all duration-500 ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/50 hover:border-primary/50 hover:bg-card/80"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isDragging ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
        </div>

        <div className="relative p-8 md:p-16 flex flex-col items-center justify-center text-center space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <FileSpreadsheet className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium text-foreground">Procesando archivo...</p>
              <p className="text-sm text-muted-foreground">Esto tomará solo un momento</p>
            </div>
          ) : (
            <>
              <div className="relative animate-float">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative p-6 bg-gradient-to-br from-muted to-card rounded-2xl border border-border/50">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-semibold text-foreground">Arrastra tu archivo XLSX aquí</h3>
                <p className="text-muted-foreground">o haz clic para seleccionar un archivo</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label>
                  <input type="file" accept=".xlsx" onChange={handleFileSelect} className="sr-only" />
                  <Button
                    size="lg"
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 cursor-pointer"
                    asChild
                  >
                    <span>
                      <FileSpreadsheet className="w-5 h-5" />
                      Seleccionar archivo XLSX
                    </span>
                  </Button>
                </label>
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md border border-destructive/30">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center gap-6 text-xs text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Formato: .xlsx
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Máx: 50MB
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  10 columnas
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
        {[
          { title: "Rápido", desc: "Procesamiento instantáneo", icon: "⚡" },
          { title: "Seguro", desc: "Tus archivos están protegidos", icon: "🔒" },
          { title: "Preciso", desc: "Recorte automático inteligente", icon: "🎯" },
        ].map((feature, i) => (
          <Card
            key={i}
            className="p-6 bg-card/50 border-border/30 hover:border-primary/30 hover:bg-card/80 transition-all duration-300 group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
            <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
