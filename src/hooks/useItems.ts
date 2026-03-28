import { useState, useEffect, useCallback } from 'react'
import type { Item } from '@/types'
import * as itemsService from '@/services/items'

export function useItems(collectionId: string | undefined) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!collectionId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await itemsService.fetchItems(collectionId)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [collectionId])

  useEffect(() => { refresh() }, [refresh])

  const create = async (description: string) => {
    if (!collectionId) throw new Error('No collection selected')
    const created = await itemsService.createItem(collectionId, description)
    setItems((prev) => [created, ...prev])
    return created
  }

  const update = async (id: string, description: string) => {
    await itemsService.updateItem(id, description)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    )
  }

  const remove = async (id: string) => {
    await itemsService.deleteItem(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return { items, loading, refresh, create, update, remove }
}
