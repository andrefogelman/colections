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

async function callEmbedApi(body: Record<string, unknown>): Promise<{ embedding: number[]; description: string }> {
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

export async function generateEmbedding(imageUrl: string): Promise<{ embedding: number[]; description: string }> {
  return callEmbedApi({ imageUrl })
}

export async function generateEmbeddingFromFile(file: File): Promise<number[]> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  const imageBase64 = btoa(binary)

  const { embedding } = await callEmbedApi({
    imageBase64,
    mediaType: file.type || 'image/jpeg',
  })
  return embedding
}
