export interface Collection {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  created_at: string
}

export interface Tag {
  id: string
  name: string
}

export interface Photo {
  id: string
  item_id: string
  storage_path: string
  url: string
  embedding: number[] | null
  position: number
  created_at: string
}

export interface Item {
  id: string
  collection_id: string
  description: string
  created_at: string
  updated_at: string
  photos?: Photo[]
  tags?: Tag[]
}

export interface SimilarResult {
  item_id: string
  photo_id: string
  url: string
  distance: number
  description: string
  collection_id: string
  collection_name: string
}
