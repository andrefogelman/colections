import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { PhotoUploader } from '@/components/PhotoUploader'
import type { Item } from '@/types'
import { fetchItem, deleteItem, setItemTags, updateItem } from '@/services/items'
import { generateEmbedding } from '@/services/search'
import { updatePhotoEmbedding } from '@/services/photos'

export function ItemPage() {
  const { collectionId, itemId } = useParams<{ collectionId: string; itemId: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const loadItem = useCallback(async () => {
    if (!itemId) return
    try {
      const data = await fetchItem(itemId)
      setItem(data)
      setDescription(data.description)
      setTags(data.tags?.map((t) => t.name) ?? [])
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { loadItem() }, [loadItem])

  const handleExtractDescription = async () => {
    if (!item?.photos?.length) {
      toast.error('Adicione pelo menos uma foto primeiro')
      return
    }

    setExtracting(true)
    try {
      const photo = item.photos[0]
      const { embedding, description: aiDescription } = await generateEmbedding(photo.url)

      setDescription(aiDescription)

      // Save description to DB immediately
      await updateItem(itemId!, aiDescription)

      // Store embedding on the photo
      await updatePhotoEmbedding(photo.id, embedding)

      // Also generate embeddings for remaining photos
      for (let i = 1; i < item.photos.length; i++) {
        try {
          const { embedding: emb } = await generateEmbedding(item.photos[i].url)
          await updatePhotoEmbedding(item.photos[i].id, emb)
        } catch {
          // Non-critical for secondary photos
        }
      }

      await loadItem()
      toast.success('Descrição extraída com sucesso')
    } catch (err) {
      toast.error('Erro ao extrair descrição: ' + String(err))
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!itemId) return
    setSaving(true)
    try {
      await updateItem(itemId, description)
      await setItemTags(itemId, tags)
      await loadItem()
      toast.success('Item atualizado')
    } catch (err) {
      toast.error('Erro ao salvar: ' + String(err))
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleDelete = async () => {
    if (!itemId || !confirm('Excluir este item e todas as suas fotos?')) return
    await deleteItem(itemId)
    navigate(`/c/${collectionId}`)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Item não encontrado.</p>
        <Link to={`/c/${collectionId}`}>
          <Button variant="link" className="mt-4">Voltar</Button>
        </Link>
      </div>
    )
  }

  const hasPhotos = (item.photos?.length ?? 0) > 0

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={`/c/${collectionId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex-1 truncate">
            {description?.substring(0, 50) || 'Novo Item'}
          </h1>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Photos */}
        <section>
          <h2 className="text-lg font-medium mb-3">1. Fotos</h2>
          <PhotoUploader
            itemId={item.id}
            photos={item.photos ?? []}
            onPhotosChange={loadItem}
          />
        </section>

        <Separator />

        {/* Step 2: AI Description */}
        <section>
          <h2 className="text-lg font-medium mb-3">2. Descrição</h2>

          <Button
            onClick={handleExtractDescription}
            disabled={!hasPhotos || extracting}
            variant="outline"
            className="w-full mb-3"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando imagem...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extrair descrição por IA
              </>
            )}
          </Button>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={hasPhotos ? 'Clique no botão acima para gerar ou escreva manualmente...' : 'Adicione fotos primeiro...'}
            rows={5}
          />
        </section>

        <Separator />

        {/* Step 3: Tags */}
        <section>
          <h2 className="text-lg font-medium mb-3">3. Tags</h2>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Adicionar tag..."
            />
            <Button type="button" variant="outline" onClick={addTag}>
              +
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </main>
    </div>
  )
}
