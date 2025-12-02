# CutImage

Herramienta profesional para limpiar y estandarizar imágenes en lote a partir de un archivo XLSX.

## Características

- Carga de archivos XLSX (hasta 15 columnas) con detección automática de columnas que contengan URLs.
- Procesamiento por lotes con recorte automático de 160px en la parte superior de cada imagen usando `sharp`.
- Seguimiento de estado en tiempo real (subida → procesamiento → resultados) y manejo de errores por fila.
- Generación de un nuevo XLSX con las URLs actualizadas que apuntan al servidor local (`/processed/...`).
- Descarga del XLSX final y visualización de URLs procesadas directamente en la UI.
- API para servir imágenes recortadas (Next.js route handler `app/processed/[batchId]/[imageName]`).
- Script de limpieza (cron) para eliminar artefactos mayores a 48 horas.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- pnpm
- `exceljs`, `sharp`

## Estructura relevante

```
app/
  api/
    upload/route.ts        # Ingesta y validación del XLSX
    process/route.ts       # Orquesta el procesamiento
    status/[batchId]/...   # Exposición del estado
    download/[batchId]/... # Descarga del XLSX procesado
  processed/[batchId]/[imageName]/route.ts # Sirve imágenes recortadas
lib/
  batch-store.ts           # Registro persistente de batches (JSON)
  batch-processor.ts       # Pipeline de recorte + generación de XLSX
  storage.ts               # Helpers para rutas en /storage
scripts/
  cleanup-old-files.ts     # Limpieza de archivos > 48h
storage/
  uploads/  cropped/  results/  batches/
```

## Requisitos

- Node.js 22+
- pnpm 10+

## Instalación y desarrollo

```bash
pnpm install
pnpm run dev
```

La app estará disponible en `http://localhost:3000`. Los archivos se guardan en `storage/`, por lo que conviene excluir esta carpeta del control de versiones o mapearla como volumen en despliegues.

## Producción / Docker

Se incluye un `Dockerfile` multi-stage:

```bash
# Build
docker build -t cutimage:latest .

# Run con volumen persistente
docker run -p 3000:3000 -v cutimage-data:/app/storage cutimage:latest
```

En Dokploy (o plataforma similar) mantén el volumen `/app/storage` para preservar uploads, imágenes recortadas y XLSX generados.

## Cron de limpieza

`scripts/cleanup-old-files.ts` elimina archivos con más de 48h (configurable con `CLEANUP_MAX_HOURS`).

Ejemplo de ejecución manual:

```bash
pnpm ts-node scripts/cleanup-old-files.ts
```

Ejemplo de cron (host o contenedor):

```
0 * * * * docker exec <container> pnpm ts-node scripts/cleanup-old-files.ts >> /var/log/cutimage-cleanup.log 2>&1
```

## Flujo de uso

1. Subir un XLSX con columnas que contengan URLs (o nombres tipo "Imagen X").
2. Revisar la vista previa y presionar **Procesar imágenes**.
3. La barra de progreso consultará `/api/status/[batchId]` hasta que el lote termine.
4. Descargar el nuevo XLSX desde la pantalla de resultados.
5. Las URLs del archivo final apuntan a `/processed/<batch>/<archivo>.jpg`, accesibles desde el mismo dominio (o el configurado al subir).

## Scripts útiles

- `pnpm run dev` – entorno local
- `pnpm run build && pnpm start` – producción
- `pnpm ts-node scripts/cleanup-old-files.ts` – limpieza manual

## Notas

- El sistema detecta columnas de URLs por encabezado (`url`, `imagen`, `foto`, `img`) y por contenido (busca valores `http(s)` en filas de datos).
- Los archivos procesados se almacenan en `storage/cropped`; los XLSX finales en `storage/results`.
- El `batchId` y metadatos se guardan como JSON en `storage/batches/`.
