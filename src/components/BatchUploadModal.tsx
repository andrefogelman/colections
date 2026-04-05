import { useState, useCallback, useRef } from 'react'
import { Upload, CheckCircle2, XCircle, Loader2, ImagePlus, FolderOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Collection } from '@/types'
import { createItem, updateItem, setItemTags } from '@/services/items'
import { uploadPhoto, updatePhotoEmbedding } from '@/services/photos'
import { classifyImage } from '@/services/search'
import { fetchTags } from '@/services/tags'

type FileStatus = 'pending' | 'uploading' | 'classifying' | 'tagging' | 'done' | 'error'

interface BatchFile {
  file: File
  preview: string
  status: FileStatus
  description?: string
  tags?: string[]
  error?: string
}

interface Props {
  open: boolean
  onClose: () => void
  collections: Collection[]
  preselectedCollectionId?: string
  onComplete?: () => void
}

export function BatchUploadModal({ open, onClose, collections, preselectedCollectionId, onComplete }: Props) {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [collectionId, setCollectionId] = useState(preselectedCollectionId ?? '')
  const [processing, setProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [done, setDone] = useState(false)
  const cancelledRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
    setCollectionId(preselectedCollectionId ?? '')
    setProcessing(false)
    setCurrentIndex(-1)
    setDone(false)
    cancelledRef.current = false
  }, [preselectedCollectionId, files])

  const handleClose = () => {
    if (!processing) {
      reset()
      onClose()
    }
  }

  const handleFiles = (newFiles: FileList | File[]) => {
    const batch: BatchFile[] = Array.from(newFiles)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as FileStatus,
      }))
    setFiles((prev) => [...prev, ...batch])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateFileStatus = (index: number, update: Partial<BatchFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...update } : f)))
  }

  const handleProcess = async () => {
    if (!collectionId || files.length === 0) return
    setProcessing(true)
    cancelledRef.current = false

    // Fetch existing tags for AI context
    let existingTagNames: string[] = []
    try {
      const tags = await fetchTags()
      existingTagNames = tags.map((t) => t.name)
    } catch {
      // Continue without existing tags
    }

    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) break
      setCurrentIndex(i)

      // Step 1: Upload
      updateFileStatus(i, { status: 'uploading' })
      let itemId: string
      let photoId: string
      try {
        const item = await createItem(collectionId, '')
        itemId = item.id
        const photo = await uploadPhoto(itemId, files[i].file, 0)
        photoId = photo.id
      } catch (err) {
        updateFileStatus(i, { status: 'error', error: `Upload falhou: ${err}` })
        continue
      }

      // Step 2: AI Classification
      updateFileStatus(i, { status: 'classifying' })
      let description = ''
      let suggestedTags: string[] = []
      try {
        const result = await classifyImage(files[i].file, existingTagNames)
        description = result.description
        suggestedTags = result.tags ?? []

        // Update item description
        await updateItem(itemId, description)

        // Update photo embedding
        await updatePhotoEmbedding(photoId, result.embedding)
      } catch (err) {
        updateFileStatus(i, { status: 'error', error: `IA falhou: ${err}` })
        continue
      }

      // Step 3: Tags
      updateFileStatus(i, { status: 'tagging' })
      try {
        if (suggestedTags.length > 0) {
          await setItemTags(itemId, suggestedTags)
          // Add new tags to existing list for next iterations
          for (const tag of suggestedTags) {
            if (!existingTagNames.includes(tag)) {
              existingTagNames.push(tag)
            }
          }
        }
      } catch {
        // Non-critical: item was created, just tags failed
      }

      updateFileStatus(i, { status: 'done', description, tags: suggestedTags })
    }

    setProcessing(false)
    setDone(true)
  }

  const handleCancel = () => {
    cancelledRef.current = true
  }

  const completedCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const newTagsCount = files
    .filter((f) => f.status === 'done')
    .flatMap((f) => f.tags ?? [])
    .filter((tag, i, arr) => arr.indexOf(tag) === i).length

  const currentFile = currentIndex >= 0 ? files[currentIndex] : null

  // Stage: selection, processing, or done
  const stage = done ? 'done' : processing ? 'processing' : 'selection'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {stage === 'done'
              ? 'Upload Concluído'
              : stage === 'processing'
                ? 'Processando...'
                : 'Upload em Lote'}
          </DialogTitle>
        </DialogHeader>

        {stage === 'selection' && (
          <div className="space-y-4">
            {/* Collection selector */}
            {!preselectedCollectionId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Coleção destino</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                >
                  <option value="">Selecione uma coleção...</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste fotos aqui ou clique para selecionar
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {/* File list preview */}
            {files.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{files.length} foto(s) selecionada(s)</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={f.preview}
                        alt=""
                        className="aspect-square object-cover rounded-md"
                      />
                      <button
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'processing' && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {completedCount + errorCount} de {files.length} fotos processadas
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${((completedCount + errorCount) / files.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current processing card */}
            {currentFile && currentFile.status !== 'done' && currentFile.status !== 'error' && (
              <div className="border border-primary/50 rounded-lg p-3">
                <div className="flex gap-3">
                  <img
                    src={currentFile.preview}
                    alt=""
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{currentFile.file.name}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {currentFile.status === 'uploading' && 'Enviando...'}
                      {currentFile.status === 'classifying' && 'Analisando com IA...'}
                      {currentFile.status === 'tagging' && 'Gerando tags...'}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {(() => {
                        const s = currentFile.status
                        const uploadDone = s !== 'pending' && s !== 'uploading'
                        const iaDone = s === 'tagging'
                        return (
                          <>
                            <Badge variant={s === 'uploading' ? 'default' : 'secondary'} className="text-xs">
                              {s === 'uploading' ? <><Loader2 className="h-2 w-2 animate-spin mr-1" /> Upload</> : uploadDone ? '✓ Upload' : 'Upload'}
                            </Badge>
                            <Badge variant={s === 'classifying' ? 'default' : 'secondary'} className="text-xs">
                              {s === 'classifying' ? <><Loader2 className="h-2 w-2 animate-spin mr-1" /> IA</> : iaDone ? '✓ IA' : 'IA'}
                            </Badge>
                            <Badge variant={s === 'tagging' ? 'default' : 'secondary'} className="text-xs">
                              {s === 'tagging' ? <><Loader2 className="h-2 w-2 animate-spin mr-1" /> Tags</> : 'Tags'}
                            </Badge>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completed items summary */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {files.map((f, i) => {
                if (f.status === 'done') {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="truncate">{f.file.name}</span>
                      <span className="text-muted-foreground truncate text-xs">— {f.description?.split('\n')[0]}</span>
                    </div>
                  )
                }
                if (f.status === 'error') {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      <span className="truncate">{f.file.name}</span>
                      <span className="text-destructive text-xs truncate">— {f.error}</span>
                    </div>
                  )
                }
                if (i > currentIndex) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 opacity-40">
                      <div className="h-4 w-4 shrink-0" />
                      <span className="truncate">{f.file.name}</span>
                      <span className="text-muted-foreground text-xs">Aguardando...</span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium">
                {completedCount} item(ns) criado(s)
              </p>
              {errorCount > 0 && (
                <p className="text-sm text-destructive">{errorCount} erro(s)</p>
              )}
              {newTagsCount > 0 && (
                <p className="text-sm text-muted-foreground">{newTagsCount} tag(s) utilizada(s)</p>
              )}
            </div>

            {/* Error details */}
            {errorCount > 0 && (
              <div className="text-left space-y-1">
                {files.filter((f) => f.status === 'error').map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="truncate">{f.file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === 'selection' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleProcess}
                disabled={files.length === 0 || !collectionId}
              >
                <Upload className="h-4 w-4 mr-2" />
                Iniciar ({files.length})
              </Button>
            </>
          )}
          {stage === 'processing' && (
            <Button variant="outline" onClick={handleCancel}>
              Cancelar Processamento
            </Button>
          )}
          {stage === 'done' && (
            <Button onClick={() => {
              reset()
              onClose()
              onComplete?.()
            }}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Ver na Coleção
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
