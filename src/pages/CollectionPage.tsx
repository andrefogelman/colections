import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemCard } from '@/components/ItemCard'
import { SearchBar } from '@/components/SearchBar'
import { SimilarResults } from '@/components/SimilarResults'
import { useItems } from '@/hooks/useItems'
import { useSearch } from '@/hooks/useSearch'

export function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()
  const { items, loading, create } = useItems(collectionId)
  const { similarResults, searching, searchMode, searchByText, searchByImage, clearSearch } = useSearch()

  const handleNewItem = async () => {
    const item = await create('')
    navigate(`/c/${collectionId}/i/${item.id}`)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold flex-1">Itens</h1>
            <Link to="/tags">
              <Button variant="ghost" size="icon" title="Gerenciar Tags">
                <Tags className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={handleNewItem}>
              <Plus className="h-4 w-4 mr-2" /> Novo Item
            </Button>
          </div>
          <SearchBar
            onTextSearch={(q) => searchByText(q, collectionId)}
            onImageSearch={(f) => searchByImage(f, collectionId)}
            onClear={clearSearch}
            searching={searching}
            searchMode={searchMode}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {searchMode === 'image' && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3">Itens Similares</h2>
            {searching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : (
              <SimilarResults results={similarResults} />
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
