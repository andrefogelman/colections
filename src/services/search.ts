import { supabase } from '@/supabase'
import type { Item, SimilarResult } from '@/types'

export async function searchByText(
  query: string,
  collectionId?: string
): Promise<Item[]> {
  const { data, error } = await supabase.rpc('search_items_text', {
    query_text: query,
    filter_collection_id: collectionId ?? null,
  })
  if (error) throw error
  return data
}

export async function searchByTag(
  tagNames: string[],
  collectionId?: string
): Promise<Item[]> {
  let query = supabase
    .from('items')
    .select(`
      *,
      photos (*),
      item_tags!inner (
        tags!inner (*)
      )
    `)
    .in('item_tags.tags.name', tagNames)

  if (collectionId) {
    query = query.eq('collection_id', collectionId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  // Normalise and deduplicate
  const seen = new Set<string>()
  return (data ?? [])
    .map((item) => ({
      ...item,
      tags: item.item_tags?.map((it: { tags: { id: string; name: string } }) => it.tags) ?? [],
      item_tags: undefined,
    }))
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

export async function searchBySimilarity(
  embedding: number[],
  collectionId?: string,
  matchCount = 10
): Promise<SimilarResult[]> {
  const { data, error } = await supabase.rpc('search_similar_photos', {
    query_embedding: embedding,
    match_count: matchCount,
    filter_collection_id: collectionId ?? null,
  })
  if (error) throw error
  return data
}

export interface EmbedResult {
  embedding: number[]
  description: string
  fingerprint: string
  tags?: string[]
}

async function callEmbedApi(body: Record<string, unknown>): Promise<EmbedResult> {
  const res = await fetch('/api/embed-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || `Embed API error: ${res.status}`)
  }
  return res.json()
}

function fileToBase64(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return btoa(binary)
  })
}

// Full analysis: description + fingerprint + embedding (for item creation)
export async function generateEmbedding(imageUrl: string): Promise<EmbedResult> {
  return callEmbedApi({ imageUrl })
}

// Full analysis from file: description + fingerprint + embedding (for image search)
export async function generateEmbeddingFromFile(file: File): Promise<EmbedResult> {
  const imageBase64 = await fileToBase64(file)
  return callEmbedApi({
    imageBase64,
    mediaType: file.type || 'image/jpeg',
  })
}

// Classify image: description + fingerprint + embedding + suggested tags
export async function classifyImage(
  file: File,
  existingTags: string[]
): Promise<EmbedResult> {
  const imageBase64 = await fileToBase64(file)
  return callEmbedApi({
    imageBase64,
    mediaType: file.type || 'image/jpeg',
    mode: 'classify',
    existingTags,
  })
}
