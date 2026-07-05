import { useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"

const isImage = (mime) => mime?.startsWith("image/")
const isPdf = (mime) => mime === "application/pdf"
const isTrustedPreviewUrl = (value) => typeof value === 'string' && value.startsWith('blob:')

export function DocumentPreviewModal({
  open,
  onOpenChange,
  document,
  previewUrl,
  mimeType,
  loading,
  error,
  onDownload,
}) {
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const renderContent = () => {
    if (loading) {
      return <div className="h-[60vh] rounded-2xl bg-muted/40 animate-pulse" />
    }

    if (error) {
      return (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>{error}</p>
        </div>
      )
    }

    if (isPdf(mimeType) && isTrustedPreviewUrl(previewUrl)) {
      return (
        <iframe
          title={document?.title || "Documento"}
          src={previewUrl}
          className="h-[70vh] w-full rounded-xl border border-border"
          sandbox="allow-downloads allow-same-origin"
          referrerPolicy="no-referrer"
        />
      )
    }

    if (isImage(mimeType) && isTrustedPreviewUrl(previewUrl)) {
      return (
        <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-xl bg-muted/40 p-3">
          <img src={previewUrl} alt={document?.title || "Documento"} className="max-h-[66vh] max-w-full rounded-lg" />
        </div>
      )
    }

    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
        <p className="text-sm font-semibold">Sem pré-visualização disponível</p>
        <p className="text-xs text-muted-foreground">Baixe o arquivo para visualizá-lo.</p>
        <Button type="button" onClick={onDownload} className="mt-2">
          Baixar
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {document?.title || "Documento"}
            {document?.status ? (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold",
                  document.status === "available"
                    ? "border-emerald-200/70 bg-emerald-500/10 text-emerald-700"
                    : document.status === "pending"
                      ? "border-amber-200/70 bg-amber-500/10 text-amber-700"
                      : document.status === "review"
                        ? "border-sky-200/70 bg-sky-500/10 text-sky-700"
                        : "border-border/70 text-muted-foreground",
                )}
              >
                {document.status}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>{document?.category ? `Categoria: ${document.category}` : null}</DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={onDownload} disabled={loading}>
            Baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
