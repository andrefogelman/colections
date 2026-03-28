import { useState, useCallback } from 'react'
import type { Item, SimilarResult } from '@/types'
import * as searchService from '@/services/search'

export function useSearch() {
  const [textResults, setTextResults] = useState<Item[]>([])
  const [similarResults, setSimilarResults] = useState<SimilarResult[]>([])
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
    try {
      const embedding = await searchService.generateEmbeddingFromFile(file)
      const results = await searchService.searchBySimilarity(embedding, collectionId)
      setSimilarResults(results)
    } finally {
      setSearching(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setTextResults([])
    setSimilarResults([])
    setSearchMode(null)
  }, [])

  return {
    textResults,
    similarResults,
    searching,
    searchMode,
    searchByText,
    searchByImage,
    clearSearch,
    setSearchMode,
  }
}
