'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/database.types'
import { validateFileForUpload } from '@/utils/FileValidation'

const INVENTORY_FILES_BUCKET = 'inventory-files'

export type ItemDocument = Database['public']['Tables']['item_documents']['Row']

type UploadableFile = {
  name: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath(householdId: string, itemId: string, fileName: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
  return `${householdId}/${itemId}/${random}-${sanitizeFileName(fileName)}`
}

async function assertItemOwnership(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string, itemId: string) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .single()

  if (error || !data) {
    return { error: 'Item not found for household' as const }
  }

  return { success: true as const }
}

export async function uploadItemDocumentFromForm(formData: FormData) {
  const householdId = formData.get('householdId') as string | null
  const itemId = formData.get('itemId') as string | null
  const file = formData.get('file') as File | Blob | null

  if (!householdId || !itemId) {
    return { error: 'Missing household or item' }
  }

  if (!file || typeof file.arrayBuffer !== 'function') {
    return { error: 'A valid file is required' }
  }

  const name = file instanceof File ? file.name : (formData.get('fileName') as string | null) ?? 'document'
  const uploadable = file instanceof File
    ? file
    : { name, type: file.type, size: file.size, arrayBuffer: () => file.arrayBuffer() }

  return uploadItemDocument(householdId, itemId, uploadable)
}

export async function getItemDocuments(householdId: string, itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('item_documents')
    .select('*')
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching item documents:', error)
    return { error: 'Failed to fetch item documents' }
  }

  return { data }
}

export async function uploadItemDocument(householdId: string, itemId: string, file: UploadableFile) {
  const supabase = await createClient()

  if (!file?.name || !file?.type || !Number.isFinite(file?.size)) {
    return { error: 'A valid file is required' }
  }

  const validationError = validateFileForUpload(file)
  if (validationError) {
    return { error: validationError }
  }

  const ownership = await assertItemOwnership(supabase, householdId, itemId)
  if ('error' in ownership) {
    return { error: ownership.error }
  }

  const filePath = buildStoragePath(householdId, itemId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(INVENTORY_FILES_BUCKET)
    .upload(filePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading file to storage:', uploadError)
    return { error: 'Failed to upload file' }
  }

  const { data, error } = await supabase
    .from('item_documents')
    .insert({
      household_id: householdId,
      item_id: itemId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document metadata:', error)
    await supabase.storage.from(INVENTORY_FILES_BUCKET).remove([filePath])
    return { error: 'Failed to save file metadata' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${itemId}`)
  return { data }
}

export async function getItemDocumentDownloadUrl(householdId: string, documentId: string, expiresInSeconds = 60) {
  const supabase = await createClient()

  const { data: doc, error: metadataError } = await supabase
    .from('item_documents')
    .select('*')
    .eq('id', documentId)
    .eq('household_id', householdId)
    .single()

  if (metadataError || !doc) {
    console.error('Error fetching document metadata:', metadataError)
    return { error: 'Document not found' }
  }

  const { data, error } = await supabase.storage
    .from(INVENTORY_FILES_BUCKET)
    .createSignedUrl(doc.file_path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error)
    return { error: 'Failed to create download URL' }
  }

  return { data: { ...doc, signedUrl: data.signedUrl } }
}

export async function deleteItemDocument(householdId: string, documentId: string) {
  const supabase = await createClient()

  const { data: doc, error: metadataError } = await supabase
    .from('item_documents')
    .select('*')
    .eq('id', documentId)
    .eq('household_id', householdId)
    .single()

  if (metadataError || !doc) {
    return { error: 'Document not found' }
  }

  const { error: storageError } = await supabase.storage
    .from(INVENTORY_FILES_BUCKET)
    .remove([doc.file_path])

  if (storageError) {
    console.error('Error deleting storage file:', storageError)
    return { error: 'Failed to delete file from storage' }
  }

  const { error: deleteError } = await supabase
    .from('item_documents')
    .delete()
    .eq('id', documentId)
    .eq('household_id', householdId)

  if (deleteError) {
    console.error('Error deleting document metadata:', deleteError)
    return { error: 'Failed to delete file metadata' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${doc.item_id}`)
  return { success: true }
}

