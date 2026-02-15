'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { validateFileForUpload } from '@/utils/FileValidation'
import {
  deleteItemDocument,
  getItemDocumentDownloadUrl,
  uploadItemDocumentFromForm,
  type ItemDocument,
} from '@/actions/ItemDocuments'
import { Button } from '@/components/ui/Button'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

type ItemDocumentsSectionProps = {
  householdId: string
  itemId: string
  documents: ItemDocument[]
}

export function ItemDocumentsSection({ householdId, itemId, documents }: ItemDocumentsSectionProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return

      const validationError = validateFileForUpload(file)
      if (validationError) {
        setUploadError(validationError)
        setUploadState('error')
        return
      }

      setUploadError(null)
      setUploadState('uploading')

      const formData = new FormData()
      formData.set('householdId', householdId)
      formData.set('itemId', itemId)
      formData.set('file', file)

      const result = await uploadItemDocumentFromForm(formData)

      if (result.error) {
        setUploadError(result.error)
        setUploadState('error')
        return
      }

      setUploadState('success')
      router.refresh()
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setUploadState('idle'), 2000)
    },
    [householdId, itemId, router],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
    },
    [handleFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleZoneClick = useCallback(() => {
    if (uploadState === 'uploading') return
    setUploadError(null)
    setUploadState('idle')
    inputRef.current?.click()
  }, [uploadState])

  const handleDelete = useCallback(
    async (documentId: string) => {
      setDeletingId(documentId)
      const result = await deleteItemDocument(householdId, documentId)
      setDeletingId(null)
      if (!result.error) {
        router.refresh()
      }
    },
    [householdId, router],
  )

  const handleView = useCallback(
    async (documentId: string) => {
      const result = await getItemDocumentDownloadUrl(householdId, documentId, 300)
      if (result.data?.signedUrl) {
        window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    },
    [householdId],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Documents</h2>

      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleZoneClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        aria-label="Upload file (click or drag and drop)"
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/30 py-6 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden
        />
        {uploadState === 'uploading' ? (
          <>
            <Loader2 className="mb-2 size-10 animate-spin text-[var(--primary)]" aria-hidden />
            <p className="text-sm font-medium text-[var(--foreground)]">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="mb-2 size-10 text-[var(--muted-foreground)]" aria-hidden />
            <p className="text-sm font-medium text-[var(--foreground)]">
              Click to select or drag and drop
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Images and PDFs, max 5MB
            </p>
          </>
        )}
      </div>

      {uploadState === 'error' && uploadError && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-100 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {uploadError}
        </div>
      )}

      {uploadState === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">File uploaded successfully.</p>
      )}

      {documents.length > 0 && (
        <ul className="space-y-2" role="list">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="size-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {doc.file_name}
                  </p>
                  {doc.file_size != null && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleView(doc.id)}
                  className="text-[var(--primary)]"
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.file_name}`}
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {documents.length === 0 && uploadState !== 'uploading' && (
        <p className="text-sm text-[var(--muted-foreground)]">No documents yet.</p>
      )}
    </div>
  )
}
