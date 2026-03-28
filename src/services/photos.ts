import { supabase } from '@/supabase'
import type { Photo } from '@/types'

export async function uploadPhoto(itemId: string, file: File, position: number): Promise<Photo> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(path)

  const { data, error } = await supabase
    .from('photos')
    .insert({
      item_id: itemId,
      storage_path: path,
      url: publicUrl,
      position,
    })
    .select()
    .single()
  if (error) throw error

  return data
}

export async function deletePhoto(photo: Photo): Promise<void> {
  await supabase.storage.from('photos').remove([photo.storage_path])
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photo.id)
  if (error) throw error
}

export async function updatePhotoEmbedding(photoId: string, embedding: number[]): Promise<void> {
  const { error } = await supabase
    .from('photos')
    .update({ embedding })
    .eq('id', photoId)
  if (error) throw error
}
