import { useState, useRef } from 'react'
import { Upload, X, Loader2, Check } from 'lucide-react'
import type { Photo } from '@/types'
import { uploadPhoto, deletePhoto } from '@/services/photos'

interface Props {
  itemId: string
  photos: Photo[]
  onPhotosChange: () => void
}

type UploadStatus = 'uploading' | 'done' | 'error'

interface UploadingPhoto {
  file: File
  preview: string
  status: UploadStatus
}

export function PhotoUploader({ itemId, photos, onPhotosChange }: Props) {
  const [uploading, setUploading] = useState<UploadingPhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const newFiles = Array.from(files)
    const newUploading: UploadingPhoto[] = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
    }))

    setUploading((prev) => [...prev, ...newUploading])

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      try {
        await uploadPhoto(itemId, file, photos.length + i)

        setUploading((prev) =>
          prev.map((u) =>
            u.file === file ? { ...u, status: 'done' as const } : u
          )
        )
        onPhotosChange()
      } catch {
        setUploading((prev) =>
          prev.map((u) =>
            u.file === file ? { ...u, status: 'error' as const } : u
          )
        )
      }
    }

    setTimeout(() => {
      setUploading((prev) => prev.filter((u) => u.status !== 'done'))
    }, 2000)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDeletePhoto = async (photo: Photo) => {
    await deletePhoto(photo)
    onPhotosChange()
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Clique ou arraste fotos aqui
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden">
            <img
              src={photo.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleDeletePhoto(photo)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
            {photo.embedding && (
              <div className="absolute bottom-1 left-1">
                <Check className="h-3 w-3 text-green-400" />
              </div>
            )}
          </div>
        ))}

        {uploading.map((u, i) => (
          <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
            <img
              src={u.preview}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {u.status === 'uploading' && (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
              {u.status === 'done' && (
                <Check className="h-6 w-6 text-green-500" />
              )}
              {u.status === 'error' && (
                <span className="text-xs text-destructive">Erro</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
