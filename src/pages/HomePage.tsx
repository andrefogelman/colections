import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CollectionCard } from '@/components/CollectionCard'
import { CollectionForm } from '@/components/CollectionForm'
import { SearchBar } from '@/components/SearchBar'
import { ImageSearchResults } from '@/components/ImageSearchResults'
import { useCollections } from '@/hooks/useCollections'
import { useSearch } from '@/hooks/useSearch'
import type { Collection } from '@/types'

export function HomePage() {
  const { collections, loading, create, update, remove } = useCollections()
  const { similarResults, textResults, imageDescription, searching, searchMode, searchByText, searchByImage, clearSearch } = useSearch()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  const handleCreateOrUpdate = async (name: string, description: string) => {
    if (editingCollection) {
      await update(editingCollection.id, { name, description: description || null })
      setEditingCollection(null)
    } else {
      await create(name, description)
    }
  }

  const handleDelete = async (collection: Collection) => {
    if (confirm(`Excluir a coleção "${collection.name}" e todos os seus itens?`)) {
      await remove(collection.id)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Coleções</h1>
            <div className="flex gap-2">
              <Link to="/tags">
                <Button variant="ghost" size="icon" title="Gerenciar Tags">
                  <Tags className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Nova Coleção
              </Button>
            </div>
          </div>
          <SearchBar
            onTextSearch={(q) => searchByText(q)}
            onImageSearch={searchByImage}
            onClear={clearSearch}
            searching={searching}
            searchMode={searchMode}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {searchMode === 'image' && (
          <ImageSearchResults
            searching={searching}
            similarResults={similarResults}
            textResults={textResults}
            imageDescription={imageDescription}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              Nenhuma coleção ainda. Crie sua primeira!
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Coleção
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={(c) => {
                  setEditingCollection(c)
                  setFormOpen(true)
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <CollectionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingCollection(null)
        }}
        onSubmit={handleCreateOrUpdate}
        collection={editingCollection}
      />
    </div>
  )
}
