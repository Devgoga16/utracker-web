import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { deleteImage, getStorageStatus, uploadImage } from '@/api/uploads'
import { apiErrorMessage } from '@/api/client'
import { Alert } from './ui'

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  folder?: string
}

export function ImageUploader({ value, onChange, max = 4, folder = 'catalog' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const { data: storage } = useQuery({ queryKey: ['storage-status'], queryFn: getStorageStatus })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImage(file, folder),
    onSuccess: (uploaded) => onChange([...value, uploaded.url]),
  })

  // Removing from R2 is best-effort: the important part is dropping the
  // reference, so a storage hiccup must not block the edit.
  const removeMutation = useMutation({
    mutationFn: deleteImage,
    onSettled: (_data, _err, url) => onChange(value.filter((u) => u !== url)),
  })

  function handleFiles(files: FileList | null) {
    setLocalError(null)
    const file = files?.[0]
    if (!file) return

    if (value.length >= max) {
      setLocalError(`Máximo ${max} imágenes`)
      return
    }
    uploadMutation.mutate(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (storage && !storage.configured) {
    return (
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
        La subida de imágenes está desactivada: faltan las variables <code>R2_*</code> en el{' '}
        <code>.env</code> de la API.
      </div>
    )
  }

  const error = uploadMutation.isError ? apiErrorMessage(uploadMutation.error) : localError

  return (
    <div className="space-y-2">
      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {value.map((url, idx) => (
          <div key={url} className="group relative">
            <img
              src={url}
              alt=""
              className="size-20 rounded-lg object-cover ring-1 ring-slate-200"
            />
            {idx === 0 && (
              <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
                Portada
              </span>
            )}
            <button
              type="button"
              aria-label="Quitar imagen"
              onClick={() => removeMutation.mutate(url)}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-slate-900 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            {uploadMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <ImagePlus size={18} />
                <span className="text-[10px]">Subir</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-xs text-slate-400">
        JPG, PNG, WebP o AVIF · hasta 5 MB · la primera foto es la portada
      </p>
    </div>
  )
}
