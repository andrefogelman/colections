import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SimilarResults } from '@/components/SimilarResults'
import { ItemCard } from '@/components/ItemCard'
import type { Item, SimilarResult } from '@/types'

interface Props {
  searching: boolean
  similarResults: SimilarResult[]
  textResults: Item[]
  imageDescription: string
  imagePreview: string | null
  onAddToCollection: () => void | Promise<void>
}

export function ImageSearchResults({
  searching,
  similarResults,
  textResults,
  imageDescription,
  imagePreview,
  onAddToCollection,
}: Props) {
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    setAdding(true)
    try {
      await onAddToCollection()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Search image preview */}
      {imagePreview && (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden border bg-muted shrink-0">
            <img
              src={imagePreview}
              alt="Imagem pesquisada"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-3">
            {imageDescription && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">A IA identificou:</p>
                <p className="text-sm line-clamp-4">{imageDescription}</p>
              </div>
            )}
            <Button
              onClick={handleAdd}
              disabled={adding || searching}
              variant="outline"
              size="sm"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inserindo...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Inserir na coleção
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {searching && (
        <div>
          <h2 className="text-lg font-medium mb-3">Buscando por similaridade visual...</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      )}

      {!searching && (
        <>
          {/* Primary: Visual Similarity */}
          <div>
            <h2 className="text-lg font-medium mb-3">
              Similaridade Visual
              {similarResults.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({similarResults.length} resultado{similarResults.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            <SimilarResults results={similarResults} />
          </div>

          {/* Secondary: Text Match (deduplicated) */}
          {(() => {
            const similarItemIds = new Set(similarResults.map((r) => r.item_id))
            const uniqueTextResults = textResults.filter((item) => !similarItemIds.has(item.id))
            if (uniqueTextResults.length === 0) return null
            return (
              <>
                <Separator />
                <div>
                  <h2 className="text-lg font-medium mb-3">
                    Correspondência por Descrição
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({uniqueTextResults.length} resultado{uniqueTextResults.length !== 1 ? 's' : ''})
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {uniqueTextResults.map((item) => (
                      <ItemCard key={item.id} item={item} collectionId={item.collection_id} />
                    ))}
                  </div>
                </div>
              </>
            )
          })()}

          {similarResults.length === 0 && textResults.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item encontrado na coleção.
            </p>
          )}
        </>
      )}
    </div>
  )
}
