import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Tags, Upload, Users, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CollectionCard } from '@/components/CollectionCard'
import { ItemCard } from '@/components/ItemCard'
import { CollectionForm } from '@/components/CollectionForm'
import { SearchBar } from '@/components/SearchBar'
import { ImageSearchResults } from '@/components/ImageSearchResults'
import { BatchUploadModal } from '@/components/BatchUploadModal'
import { useAuth } from '@/hooks/useAuth'
import { useCollections } from '@/hooks/useCollections'
import { useSearch } from '@/hooks/useSearch'
import { createItem, updateItem } from '@/services/items'
import { uploadPhoto, updatePhotoEmbedding } from '@/services/photos'
import { generateEmbedding } from '@/services/search'
import type { Collection } from '@/types'

export function HomePage() {
  const navigate = useNavigate()
  const { isAdmin, signOut } = useAuth()
  const { collections, loading, create, update, remove } = useCollections()
  const { similarResults, textResults, tagResults, imageDescription, searchImagePreview, searchFile, searching, searchMode, searchByText, searchByTag, searchByImage, clearSearch } = useSearch()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)

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

  const handleAddToCollectionPick = () => {
    setCollectionPickerOpen(true)
  }

  const handlePickCollection = async (collectionId: string) => {
    if (!searchFile) return
    setCollectionPickerOpen(false)
    try {
      const item = await createItem(collectionId, imageDescription || '')
      if (imageDescription) {
        await updateItem(item.id, imageDescription)
      }
      const photo = await uploadPhoto(item.id, searchFile, 0)
      try {
        const { embedding } = await generateEmbedding(photo.url)
        await updatePhotoEmbedding(photo.id, embedding)
      } catch {
        // Non-critical
      }
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
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">Coleções</h1>
            <div className="flex gap-1 sm:gap-2">
              {isAdmin && (
                <Link to="/admin/users">
                  <Button variant="ghost" size="icon" title="Gerenciar Usuários">
                    <Users className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link to="/tags">
                <Button variant="ghost" size="icon" title="Gerenciar Tags">
                  <Tags className="h-4 w-4" />
                </Button>
              </Link>
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={() => setBatchOpen(true)} size="sm" className="sm:h-9 sm:px-4">
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload em Lote</span>
                  </Button>
                  <Button onClick={() => setFormOpen(true)} size="sm" className="sm:h-9 sm:px-4">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nova Coleção</span>
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" title="Sair" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SearchBar
            onTextSearch={(q) => searchByText(q)}
            onTagSearch={(tags) => searchByTag(tags)}
            onImageSearch={searchByImage}
            onClear={clearSearch}
            searching={searching}
            searchMode={searchMode}
            resultCount={searchMode === 'text' ? textResults.length : undefined}
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
            onAddToCollection={handleAddToCollectionPick}
          />
        )}

        {searchMode === 'text' && !searching && textResults.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {textResults.map((item) => (
                <ItemCard key={item.id} item={item} collectionId={item.collection_id} />
              ))}
            </div>
          </div>
        )}

        {searchMode === 'tag' && !searching && (
          <div className="mb-6">
            {tagResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item encontrado com essas tags.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {tagResults.map((item) => (
                  <ItemCard key={item.id} item={item} collectionId={item.collection_id} />
                ))}
              </div>
            )}
          </div>
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
              {isAdmin ? 'Nenhuma coleção ainda. Crie sua primeira!' : 'Nenhuma coleção disponível.'}
            </p>
            {isAdmin && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Nova Coleção
              </Button>
            )}
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

      <BatchUploadModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        collections={collections}
      />

      {/* Collection picker dialog */}
      <Dialog open={collectionPickerOpen} onOpenChange={setCollectionPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Coleção</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-accent text-left"
                onClick={() => handlePickCollection(collection.id)}
              >
                <span className="font-medium">{collection.name}</span>
                {collection.description && (
                  <span className="text-sm text-muted-foreground truncate">
                    {collection.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
