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
}

export function ImageSearchResults({ searching, similarResults, textResults, imageDescription }: Props) {
  if (searching) {
    return (
      <div className="space-y-6 mb-6">
        <div>
          <h2 className="text-lg font-medium mb-3">Buscando por similaridade visual...</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hasVisualResults = similarResults.length > 0
  const hasTextResults = textResults.length > 0

  // Deduplicate: remove text results that already appear in similar results
  const similarItemIds = new Set(similarResults.map((r) => r.item_id))
  const uniqueTextResults = textResults.filter((item) => !similarItemIds.has(item.id))

  return (
    <div className="space-y-6 mb-6">
      {/* AI Description */}
      {imageDescription && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">A IA identificou:</p>
          <p className="text-sm">{imageDescription}</p>
        </div>
      )}

      {/* Primary: Visual Similarity */}
      <div>
        <h2 className="text-lg font-medium mb-3">
          Similaridade Visual
          {hasVisualResults && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({similarResults.length} resultado{similarResults.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        <SimilarResults results={similarResults} />
      </div>

      {/* Secondary: Text Match */}
      {uniqueTextResults.length > 0 && (
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
      )}

      {!hasVisualResults && !hasTextResults && (
        <p className="text-center text-muted-foreground py-8">
          Nenhum item encontrado.
        </p>
      )}
    </div>
  )
}
