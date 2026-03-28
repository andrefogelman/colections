import { supabase } from '@/supabase'
import type { Tag } from '@/types'

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createTag(name: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: name.trim().toLowerCase() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTag(id: string, name: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update({ name: name.trim().toLowerCase() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTag(id: string): Promise<void> {
  // Remove from item_tags first (cascade should handle, but be explicit)
  await supabase.from('item_tags').delete().eq('tag_id', id)
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}

export async function getTagUsageCount(tagId: string): Promise<number> {
  const { count, error } = await supabase
    .from('item_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', tagId)
  if (error) throw error
  return count ?? 0
}
