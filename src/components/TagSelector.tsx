import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { Tag } from '@/types'
import { fetchTags, createTag } from '@/services/tags'

interface Props {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TagSelector({ selected, onChange }: Props) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTags().then(setAllTags)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleTag = (tagName: string) => {
    if (selected.includes(tagName)) {
      onChange(selected.filter((t) => t !== tagName))
    } else {
      onChange([...selected, tagName])
    }
  }

  const removeTag = (tagName: string) => {
    onChange(selected.filter((t) => t !== tagName))
  }

  const handleCreateTag = async () => {
    const name = filter.trim().toLowerCase()
    if (!name || allTags.some((t) => t.name === name)) return
    setCreating(true)
    try {
      const tag = await createTag(name)
      setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      onChange([...selected, tag.name])
      setFilter('')
    } finally {
      setCreating(false)
    }
  }

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  )

  const filterMatchesExisting = allTags.some((t) => t.name === filter.trim().toLowerCase())

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => removeTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div ref={containerRef} className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
        >
          <span className="text-muted-foreground">
            {selected.length > 0
              ? `${selected.length} tag${selected.length > 1 ? 's' : ''} selecionada${selected.length > 1 ? 's' : ''}`
              : 'Selecionar tags...'}
          </span>
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
            {/* Filter input */}
            <div className="p-2 border-b">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar ou criar tag..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (filter.trim() && !filterMatchesExisting) {
                      handleCreateTag()
                    } else if (filtered.length === 1) {
                      toggleTag(filtered[0].name)
                    }
                  }
                }}
              />
            </div>

            {/* Tag list */}
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 && !filter.trim() && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Nenhuma tag criada ainda.
                </p>
              )}

              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-accent text-left"
                  onClick={() => toggleTag(tag.name)}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                    selected.includes(tag.name) ? 'bg-primary border-primary' : 'border-input'
                  }`}>
                    {selected.includes(tag.name) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  {tag.name}
                </button>
              ))}

              {/* Create new tag option */}
              {filter.trim() && !filterMatchesExisting && (
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-accent text-left text-primary"
                  onClick={handleCreateTag}
                  disabled={creating}
                >
                  <Plus className="h-4 w-4" />
                  {creating ? 'Criando...' : `Criar "${filter.trim().toLowerCase()}"`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
