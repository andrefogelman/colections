import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ItemCard } from '@/components/ItemCard'
import { SearchBar } from '@/components/SearchBar'
import { ImageSearchResults } from '@/components/ImageSearchResults'
import { useItems } from '@/hooks/useItems'
import { useSearch } from '@/hooks/useSearch'
import { uploadPhoto } from '@/services/photos'
import { updateItem } from '@/services/items'
import { generateEmbedding } from '@/services/search'
import { updatePhotoEmbedding } from '@/services/photos'

export function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()
  const { items, loading, create, refresh } = useItems(collectionId)
  const { similarResults, textResults, tagResults, imageDescription, searchImagePreview, searchFile, searching, searchMode, searchByText, searchByTag, searchByImage, clearSearch } = useSearch()

  const handleNewItem = async () => {
    const item = await create('')
    navigate(`/c/${collectionId}/i/${item.id}`)
  }

  const handleAddSearchImageToCollection = async () => {
    if (!searchFile || !collectionId) return
    try {
      // Create item with AI description
      const item = await create(imageDescription || '')
      if (imageDescription) {
        await updateItem(item.id, imageDescription)
      }

      // Upload the search image as the item's photo
      const photo = await uploadPhoto(item.id, searchFile, 0)

      // Generate and store embedding
      try {
        const { embedding } = await generateEmbedding(photo.url)
        await updatePhotoEmbedding(photo.id, embedding)
      } catch {
        // Non-critical
      }

      refresh()
      toast.success('Item inserido na coleção')
      navigate(`/c/${collectionId}/i/${item.id}`)
    } catch (err) {
      toast.error('Erro ao inserir: ' + String(err))
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold flex-1 truncate">Itens</h1>
            <Link to="/tags">
              <Button variant="ghost" size="icon" title="Gerenciar Tags">
                <Tags className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={handleNewItem} size="sm" className="sm:h-9 sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Item</span>
            </Button>
          </div>
          <SearchBar
            onTextSearch={(q) => searchByText(q, collectionId)}
            onTagSearch={(tags) => searchByTag(tags, collectionId)}
            onImageSearch={(f) => searchByImage(f, collectionId)}
            onClear={clearSearch}
            searching={searching}
            searchMode={searchMode}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {searchMode === 'image' && (
          <ImageSearchResults
            searching={searching}
            similarResults={similarResults}
            textResults={textResults}
            imageDescription={imageDescription}
            imagePreview={searchImagePreview}
            onAddToCollection={handleAddSearchImageToCollection}
          />
        )}

        {searchMode === 'tag' && !searching && (
          <div className="mb-6">
            {tagResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item encontrado com essas tags.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tagResults.map((item) => (
                  <ItemCard key={item.id} item={item} collectionId={collectionId!} />
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              Nenhum item nesta coleção.
            </p>
            <Button onClick={handleNewItem}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} collectionId={collectionId!} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
