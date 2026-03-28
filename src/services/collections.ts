import { supabase } from '@/supabase'
import type { Collection } from '@/types'

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCollection(name: string, description?: string): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .insert({ name, description: description || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCollection(id: string, updates: Partial<Pick<Collection, 'name' | 'description' | 'cover_url'>>): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getCollectionItemCount(collectionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId)
  if (error) throw error
  return count ?? 0
}
