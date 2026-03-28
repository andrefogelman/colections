import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Tag } from '@/types'
import { fetchTags, createTag, updateTag, deleteTag } from '@/services/tags'

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newTagName, setNewTagName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const loadTags = useCallback(async () => {
    try {
      const data = await fetchTags()
      setTags(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTags() }, [loadTags])

  const handleCreate = async () => {
    const name = newTagName.trim().toLowerCase()
    if (!name) return
    if (tags.some((t) => t.name === name)) {
      toast.error('Tag já existe')
      return
    }
    try {
      const tag = await createTag(name)
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName('')
      toast.success(`Tag "${name}" criada`)
    } catch {
      toast.error('Erro ao criar tag')
    }
  }

  const handleUpdate = async (id: string) => {
    const name = editingName.trim().toLowerCase()
    if (!name) return
    try {
      const updated = await updateTag(id, name)
      setTags((prev) =>
        prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      toast.success('Tag atualizada')
    } catch {
      toast.error('Erro ao atualizar tag')
    }
  }

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Excluir a tag "${tag.name}"? Ela será removida de todos os itens.`)) return
    try {
      await deleteTag(tag.id)
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      toast.success(`Tag "${tag.name}" excluída`)
    } catch {
      toast.error('Erro ao excluir tag')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Gerenciar Tags</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create new tag */}
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreate()
              }
            }}
            placeholder="Nova tag..."
          />
          <Button onClick={handleCreate} disabled={!newTagName.trim()}>
            <Plus className="h-4 w-4 mr-2" /> Criar
          </Button>
        </div>

        {/* Tag list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma tag criada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 p-3 rounded-md border bg-card"
              >
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(tag.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdate(tag.id)}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-sm">
                      {tag.name}
                    </Badge>
                    <span className="flex-1" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(tag.id)
                        setEditingName(tag.name)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(tag)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
