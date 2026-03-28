import { useState, useCallback } from 'react'
import type { Item, SimilarResult } from '@/types'
import * as searchService from '@/services/search'

export interface ImageSearchResult {
  similarResults: SimilarResult[]
  textResults: Item[]
  aiDescription: string
}

export function useSearch() {
  const [textResults, setTextResults] = useState<Item[]>([])
  const [similarResults, setSimilarResults] = useState<SimilarResult[]>([])
  const [imageDescription, setImageDescription] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'text' | 'image' | null>(null)

  const searchByText = useCallback(async (query: string, collectionId?: string) => {
    if (!query.trim()) {
      setTextResults([])
      setSearchMode(null)
      return
    }
    setSearching(true)
    setSearchMode('text')
    setSimilarResults([])
    setImageDescription('')
    try {
      const results = await searchService.searchByText(query, collectionId)
      setTextResults(results)
    } finally {
      setSearching(false)
    }
  }, [])

  const searchByImage = useCallback(async (file: File, collectionId?: string) => {
    setSearching(true)
    setSearchMode('image')
    setTextResults([])
    setSimilarResults([])
    setImageDescription('')
    try {
      // Step 1: Generate embedding + description from image
      const { embedding, description } = await searchService.generateEmbeddingFromFile(file)
      setImageDescription(description)

      // Step 2: Run both searches in parallel
      const [similar, textMatches] = await Promise.all([
        searchService.searchBySimilarity(embedding, collectionId, 20),
        description
          ? searchService.searchByText(description.substring(0, 200), collectionId).catch(() => [] as Item[])
          : Promise.resolve([] as Item[]),
      ])

      setSimilarResults(similar)
      setTextResults(textMatches)
    } finally {
      setSearching(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setTextResults([])
    setSimilarResults([])
    setImageDescription('')
    setSearchMode(null)
  }, [])

  return {
    textResults,
    similarResults,
    imageDescription,
    searching,
    searchMode,
    searchByText,
    searchByImage,
    clearSearch,
    setSearchMode,
  }
}
