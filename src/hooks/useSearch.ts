import { useState, useCallback } from 'react'
import type { Item, SimilarResult } from '@/types'
import * as searchService from '@/services/search'

export function useSearch() {
  const [textResults, setTextResults] = useState<Item[]>([])
  const [tagResults, setTagResults] = useState<Item[]>([])
  const [similarResults, setSimilarResults] = useState<SimilarResult[]>([])
  const [imageDescription, setImageDescription] = useState('')
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(null)
  const [searchFile, setSearchFile] = useState<File | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'text' | 'image' | 'tag' | null>(null)

  const resetState = () => {
    setTextResults([])
    setTagResults([])
    setSimilarResults([])
    setImageDescription('')
    setSearchImagePreview(null)
    setSearchFile(null)
  }

  const searchByText = useCallback(async (query: string, collectionId?: string) => {
    if (!query.trim()) {
      setTextResults([])
      setSearchMode(null)
      return
    }
    setSearching(true)
    setSearchMode('text')
    resetState()
    try {
      const results = await searchService.searchByText(query, collectionId)
      setTextResults(results)
    } finally {
      setSearching(false)
    }
  }, [])

  const searchByTag = useCallback(async (tagNames: string[], collectionId?: string) => {
    if (tagNames.length === 0) {
      setTagResults([])
      setSearchMode(null)
      return
    }
    setSearching(true)
    setSearchMode('tag')
    resetState()
    try {
      const results = await searchService.searchByTag(tagNames, collectionId)
      setTagResults(results)
    } finally {
      setSearching(false)
    }
  }, [])

  const searchByImage = useCallback(async (file: File, collectionId?: string) => {
    setSearching(true)
    setSearchMode('image')
    resetState()
    setSearchImagePreview(URL.createObjectURL(file))
    setSearchFile(file)
    try {
      const { embedding, description } = await searchService.generateEmbeddingFromFile(file)
      setImageDescription(description)

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
    resetState()
    setSearchMode(null)
  }, [])

  return {
    textResults,
    tagResults,
    similarResults,
    imageDescription,
    searchImagePreview,
    searchFile,
    searching,
    searchMode,
    searchByText,
    searchByTag,
    searchByImage,
    clearSearch,
    setSearchMode,
  }
}
