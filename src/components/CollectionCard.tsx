import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Collection } from '@/types'
import { getCollectionItemCount } from '@/services/collections'

interface Props {
  collection: Collection
  onEdit: (collection: Collection) => void
  onDelete: (collection: Collection) => void
}

export function CollectionCard({ collection, onEdit, onDelete }: Props) {
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    getCollectionItemCount(collection.id).then(setItemCount)
  }, [collection.id])

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/c/${collection.id}`} className="block">
        {collection.cover_url ? (
          <div className="aspect-video bg-muted">
            <img
              src={collection.cover_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <CardContent className="p-4">
          <h3 className="font-medium truncate">{collection.name}</h3>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </p>
        </CardContent>
      </Link>

      <div className="absolute top-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md bg-secondary h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(collection)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(collection)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
