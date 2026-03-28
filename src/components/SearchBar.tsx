import { useState, useRef, useEffect } from 'react'
import { Search, Image, Tags, X, Loader2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Tag } from '@/types'
import { fetchTags } from '@/services/tags'

interface Props {
  onTextSearch: (query: string) => void
  onImageSearch: (file: File) => void
  onTagSearch: (tagNames: string[]) => void
  onClear: () => void
  searching: boolean
  searchMode: 'text' | 'image' | 'tag' | null
  resultCount?: number
}

export function SearchBar({ onTextSearch, onImageSearch, onTagSearch, onClear, searching, searchMode, resultCount }: Props) {
  const [query, setQuery] = useState('')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTags().then(setAllTags)
  }, [])

  useEffect(() => {
    if (!tagDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tagDropdownOpen])

  const handleSearch = () => {
    if (!query.trim()) return
    setSelectedTags([])
    onTextSearch(query.trim())
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setQuery('')
      setSelectedTags([])
      onImageSearch(file)
    }
  }

  const toggleTag = (tagName: string) => {
    const next = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName]
    setSelectedTags(next)
    setQuery('')
    if (next.length > 0) {
      onTagSearch(next)
    } else {
      onClear()
    }
  }

  const handleClear = () => {
    setQuery('')
    setSelectedTags([])
    onClear()
  }

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagFilter.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder="Buscar..."
            className="pl-9 pr-9 text-sm sm:text-base"
          />
          {(query || searchMode) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Text search button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          title="Buscar"
        >
          {searching && searchMode === 'text' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>

        {/* Tag filter button */}
        <div ref={tagDropdownRef} className="relative">
          <Button
            variant={searchMode === 'tag' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
            title="Filtrar por tags"
          >
            <Tags className="h-4 w-4" />
          </Button>

          {tagDropdownOpen && (
            <div className="absolute right-0 z-20 mt-1 w-[calc(100vw-2rem)] sm:w-56 max-w-[16rem] rounded-md border bg-popover shadow-md">
              <div className="p-2 border-b">
                <Input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Filtrar tags..."
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Nenhuma tag encontrada.
                  </p>
                ) : (
                  filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-accent text-left"
                      onClick={() => toggleTag(tag.name)}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                        selectedTags.includes(tag.name) ? 'bg-primary border-primary' : 'border-input'
                      }`}>
                        {selectedTags.includes(tag.name) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image search button */}
        <Button
          variant={searchMode === 'image' ? 'default' : 'outline'}
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          title="Buscar por imagem"
        >
          {searching && searchMode === 'image' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => toggleTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search feedback */}
      {!searching && searchMode === 'text' && resultCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          {resultCount === 0
            ? 'Nenhum item encontrado.'
            : `${resultCount} item${resultCount !== 1 ? 's' : ''} encontrado${resultCount !== 1 ? 's' : ''}.`}
        </p>
      )}
    </div>
  )
}
