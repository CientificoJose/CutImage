"use client"

import { Scissors, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onReset: () => void
  showReset: boolean
}

export function Header({ onReset, showReset }: HeaderProps) {
  return (
    <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300" />
            <div className="relative p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30 group-hover:border-primary/50 transition-all duration-300">
              <Scissors className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-foreground">Cut</span>
              <span className="text-primary animate-glow inline-block">Image</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Procesador de imágenes XLSX</p>
          </div>
        </div>

        {showReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 bg-transparent"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo archivo</span>
          </Button>
        )}
      </div>
    </header>
  )
}
