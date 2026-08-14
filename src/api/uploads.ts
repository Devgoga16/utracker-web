import { api } from './client'

export interface UploadedImage {
  url: string
  key: string
  contentType: string
  size: number
}

export async function getStorageStatus() {
  const { data } = await api.get<{ configured: boolean }>('/uploads/status')
  return data
}

export async function uploadImage(file: File, folder = 'catalog') {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)

  // Let the browser set the multipart boundary; overriding it breaks the parse.
  const { data } = await api.post<UploadedImage>('/uploads', form)
  return data
}

export async function deleteImage(url: string) {
  await api.delete('/uploads', { data: { url } })
}
