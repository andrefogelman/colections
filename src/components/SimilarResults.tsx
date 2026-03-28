import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SimilarResult } from '@/types'

interface Props {
  results: SimilarResult[]
}

export function SimilarResults({ results }: Props) {
  if (results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum item similar encontrado.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
      {results.map((result) => {
        const similarity = Math.round((1 - result.distance) * 100)
        return (
          <Link
            key={result.photo_id}
            to={`/c/${result.collection_id}/i/${result.item_id}`}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative">
                <img
                  src={result.url}
                  alt={result.description}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 right-2 text-xs">
                  {similarity}%
                </Badge>
              </div>
              <div className="p-2">
                <p className="text-xs line-clamp-2">{result.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.collection_name}
                </p>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
