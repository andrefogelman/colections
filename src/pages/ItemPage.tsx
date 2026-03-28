import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { PhotoUploader } from '@/components/PhotoUploader'
import { ItemForm } from '@/components/ItemForm'
import type { Item } from '@/types'
import { fetchItem, deleteItem, setItemTags, updateItem } from '@/services/items'

export function ItemPage() {
  const { collectionId, itemId } = useParams<{ collectionId: string; itemId: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  const loadItem = useCallback(async () => {
    if (!itemId) return
    try {
      const data = await fetchItem(itemId)
      setItem(data)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { loadItem() }, [loadItem])

  const handleUpdate = async (description: string, tags: string[]) => {
    if (!itemId) return
    await updateItem(itemId, description)
    await setItemTags(itemId, tags)
    await loadItem()
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
            {item.description?.substring(0, 50) || 'Item'}
          </h1>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Fotos</h2>
          <PhotoUploader
            itemId={item.id}
            photos={item.photos ?? []}
            onPhotosChange={loadItem}
          />
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-medium mb-3">Detalhes</h2>
          <ItemForm
            description={item.description}
            tags={item.tags?.map((t) => t.name) ?? []}
            onSubmit={handleUpdate}
            submitLabel="Atualizar"
          />
        </section>
      </main>
    </div>
  )
}
