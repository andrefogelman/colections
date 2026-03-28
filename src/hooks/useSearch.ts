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
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(null)
  const [searchFile, setSearchFile] = useState<File | null>(null)
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
    setSearchImagePreview(null)
    setSearchFile(null)
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
    setSearchImagePreview(URL.createObjectURL(file))
    setSearchFile(file)
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
    setSearchImagePreview(null)
    setSearchFile(null)
    setSearchMode(null)
  }, [])

  return {
    textResults,
    similarResults,
    imageDescription,
    searchImagePreview,
    searchFile,
    searching,
    searchMode,
    searchByText,
    searchByImage,
    clearSearch,
    setSearchMode,
  }
}
