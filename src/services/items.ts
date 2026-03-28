import { supabase } from '@/supabase'
import type { Item } from '@/types'

const ITEM_SELECT = `*, photos (*), item_tags ( tags (*) )`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseItem(raw: any): Item {
  return {
    ...raw,
    tags: raw.item_tags?.map((it: { tags: { id: string; name: string } }) => it.tags) ?? [],
    item_tags: undefined,
  }
}

export async function fetchItems(collectionId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(normaliseItem)
}

export async function fetchItem(id: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return normaliseItem(data)
}

export async function createItem(collectionId: string, description: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({ collection_id: collectionId, description })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItem(id: string, description: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ description })
    .eq('id', id)
  if (error) throw error
}

export async function deleteItem(id: string): Promise<void> {
  // Get photos to clean up storage
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('item_id', id)

  if (photos && photos.length > 0) {
    await supabase.storage
      .from('photos')
      .remove(photos.map((p) => p.storage_path))
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function setItemTags(itemId: string, tagNames: string[]): Promise<void> {
  // Remove existing tags
  const { error: deleteError } = await supabase.from('item_tags').delete().eq('item_id', itemId)
  if (deleteError) throw deleteError

  if (tagNames.length === 0) return

  // Upsert tags
  const { data: tags, error: tagError } = await supabase
    .from('tags')
    .upsert(
      tagNames.map((name) => ({ name: name.trim().toLowerCase() })),
      { onConflict: 'name' }
    )
    .select()
  if (tagError) throw tagError

  // Create item_tags
  const { error } = await supabase
    .from('item_tags')
    .insert(tags.map((t) => ({ item_id: itemId, tag_id: t.id })))
  if (error) throw error
}
