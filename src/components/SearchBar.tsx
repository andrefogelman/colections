import { useState, useRef, useEffect } from 'react'
import { Search, Image, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  onTextSearch: (query: string) => void
  onImageSearch: (file: File) => void
  onClear: () => void
  searching: boolean
  searchMode: 'text' | 'image' | null
}

export function SearchBar({ onTextSearch, onImageSearch, onClear, searching, searchMode }: Props) {
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      if (searchMode === 'text') onClear()
      return
    }
    debounceRef.current = setTimeout(() => {
      onTextSearch(query.trim())
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setQuery('')
      onImageSearch(file)
    }
  }

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por descrição..."
          className="pl-9 pr-9"
        />
        {(query || searchMode) && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      <Button
        variant={searchMode === 'image' ? 'default' : 'outline'}
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        title="Buscar por imagem"
      >
        <Image className="h-4 w-4" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </div>
  )
}
