import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Item } from '@/types'

interface Props {
  item: Item
  collectionId: string
}

export function ItemCard({ item, collectionId }: Props) {
  const coverPhoto = item.photos?.[0]

  return (
    <Link to={`/c/${collectionId}/i/${item.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {coverPhoto ? (
          <div className="aspect-square bg-muted">
            <img
              src={coverPhoto.url}
              alt={item.description}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        <div className="p-3">
          <p className="text-sm line-clamp-2">{item.description || 'Sem descrição'}</p>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          {item.photos && item.photos.length > 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              {item.photos.length} fotos
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
