import { useState, useEffect, useCallback } from 'react'
import type { Collection } from '@/types'
import * as collectionsService from '@/services/collections'

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await collectionsService.fetchCollections()
      setCollections(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = async (name: string, description?: string) => {
    const created = await collectionsService.createCollection(name, description)
    setCollections((prev) => [created, ...prev])
    return created
  }

  const update = async (id: string, updates: Partial<Pick<Collection, 'name' | 'description' | 'cover_url'>>) => {
    const updated = await collectionsService.updateCollection(id, updates)
    setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  const remove = async (id: string) => {
    await collectionsService.deleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  return { collections, loading, refresh, create, update, remove }
}
