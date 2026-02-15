import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import {
  deleteItemDocument,
  getItemDocumentDownloadUrl,
  getItemDocuments,
  uploadItemDocument,
  uploadItemDocumentFromForm,
} from './ItemDocuments'
import { validateFileForUpload } from '@/utils/FileValidation'

const HOUSEHOLD_ID = 'household-1'
const ITEM_ID = 'item-1'
const DOCUMENT_ID = 'doc-1'

function createSupabaseHarness() {
  const itemSelectChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  itemSelectChain.select.mockReturnValue(itemSelectChain)
  itemSelectChain.eq.mockReturnValue(itemSelectChain)

  const docsSelectChain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  }
  docsSelectChain.select.mockReturnValue(docsSelectChain)
  docsSelectChain.eq.mockReturnValue(docsSelectChain)
  docsSelectChain.order.mockReturnValue(docsSelectChain)

  const docsInsertChain = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  docsInsertChain.insert.mockReturnValue(docsInsertChain)
  docsInsertChain.select.mockReturnValue(docsInsertChain)

  const docsDeleteChain = {
    delete: vi.fn(),
    eq: vi.fn(),
  }
  docsDeleteChain.delete.mockReturnValue(docsDeleteChain)
  docsDeleteChain.eq.mockReturnValue(docsDeleteChain)
  docsDeleteChain.then = (resolve: (value: { error: unknown }) => void) => {
    queueMicrotask(() => resolve({ error: null }))
    return Promise.resolve({ error: null })
  }
  docsDeleteChain.catch = () => docsDeleteChain

  const upload = vi.fn()
  const remove = vi.fn()
  const createSignedUrl = vi.fn()
  const storageFrom = vi.fn(() => ({
    upload,
    remove,
    createSignedUrl,
  }))

  const from = vi.fn((table: string) => {
    if (table === 'inventory_items') {
      return itemSelectChain
    }

    if (table === 'item_documents') {
      return {
        ...docsSelectChain,
        insert: docsInsertChain.insert,
        delete: docsDeleteChain.delete,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  const client = {
    from,
    storage: {
      from: storageFrom,
    },
  }

  return {
    client,
    itemSelectChain,
    docsSelectChain,
    docsInsertChain,
    docsDeleteChain,
    storageFrom,
    upload,
    remove,
    createSignedUrl,
  }
}

function createFileMock(overrides?: Partial<{ name: string; type: string; size: number }>) {
  return {
    name: overrides?.name ?? 'receipt.pdf',
    type: overrides?.type ?? 'application/pdf',
    size: overrides?.size ?? 1024,
    arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
  }
}

describe('ItemDocuments actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists documents scoped by household and item', async () => {
    const harness = createSupabaseHarness()
    harness.docsSelectChain.order.mockResolvedValue({ data: [{ id: DOCUMENT_ID }], error: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getItemDocuments(HOUSEHOLD_ID, ITEM_ID)

    expect(result.data).toEqual([{ id: DOCUMENT_ID }])
    expect(harness.docsSelectChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(harness.docsSelectChain.eq).toHaveBeenCalledWith('item_id', ITEM_ID)
  })

  it('rejects upload when file type is unsupported', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)
    const file = createFileMock({ type: 'text/plain' })

    const result = await uploadItemDocument(HOUSEHOLD_ID, ITEM_ID, file)

    expect(result.error).toBe('Only images and PDFs are allowed')
  })

  it('uploads file and inserts metadata on success', async () => {
    const harness = createSupabaseHarness()
    harness.itemSelectChain.single.mockResolvedValue({ data: { id: ITEM_ID }, error: null })
    harness.upload.mockResolvedValue({ data: { path: 'uploaded-path' }, error: null })
    harness.docsInsertChain.single.mockResolvedValue({
      data: { id: DOCUMENT_ID, item_id: ITEM_ID },
      error: null,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await uploadItemDocument(HOUSEHOLD_ID, ITEM_ID, createFileMock())

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ id: DOCUMENT_ID, item_id: ITEM_ID })
    expect(harness.upload).toHaveBeenCalledTimes(1)
    expect(harness.docsInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        file_name: 'receipt.pdf',
        file_type: 'application/pdf',
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/${ITEM_ID}`)
  })

  it('removes uploaded file when metadata insert fails', async () => {
    const harness = createSupabaseHarness()
    harness.itemSelectChain.single.mockResolvedValue({ data: { id: ITEM_ID }, error: null })
    harness.upload.mockResolvedValue({ data: { path: 'uploaded-path' }, error: null })
    harness.docsInsertChain.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    harness.remove.mockResolvedValue({ data: null, error: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await uploadItemDocument(HOUSEHOLD_ID, ITEM_ID, createFileMock())

    expect(result.error).toBe('Failed to save file metadata')
    expect(harness.remove).toHaveBeenCalledTimes(1)
  })

  it('returns signed URL for household-scoped document', async () => {
    const harness = createSupabaseHarness()
    harness.docsSelectChain.single.mockResolvedValue({
      data: {
        id: DOCUMENT_ID,
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        file_path: 'household-1/item-1/doc.pdf',
        file_name: 'doc.pdf',
      },
      error: null,
    })
    harness.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getItemDocumentDownloadUrl(HOUSEHOLD_ID, DOCUMENT_ID, 120)

    expect(result.error).toBeUndefined()
    expect(result.data?.signedUrl).toBe('https://example.com/signed')
    expect(harness.createSignedUrl).toHaveBeenCalledWith('household-1/item-1/doc.pdf', 120)
  })

  it('uploadItemDocumentFromForm returns error when file is missing', async () => {
    const formData = new FormData()
    formData.set('householdId', HOUSEHOLD_ID)
    formData.set('itemId', ITEM_ID)

    const result = await uploadItemDocumentFromForm(formData)

    expect(result.error).toBe('A valid file is required')
  })

  it('uploadItemDocumentFromForm returns error when household or item is missing', async () => {
    const formData = new FormData()
    formData.set('file', new File(['x'], 'doc.pdf', { type: 'application/pdf' }))

    expect((await uploadItemDocumentFromForm(formData)).error).toBe('Missing household or item')
  })

  it('validateFileForUpload rejects unsupported types', () => {
    const file = new File(['x'], 'x.txt', { type: 'text/plain' })
    expect(validateFileForUpload(file)).toBe('Only images and PDFs are allowed')
  })

  it('validateFileForUpload rejects files over 5MB', () => {
    const buffer = new ArrayBuffer(6 * 1024 * 1024)
    const file = new File([buffer], 'x.pdf', { type: 'application/pdf' })
    expect(validateFileForUpload(file)).toBe('File size must be 5MB or less')
  })

  it('validateFileForUpload accepts valid PDF', () => {
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' })
    expect(validateFileForUpload(file)).toBeNull()
  })

  it('validateFileForUpload accepts valid image', () => {
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    expect(validateFileForUpload(file)).toBeNull()
  })

  it('deletes storage object and metadata for scoped document', async () => {
    const harness = createSupabaseHarness()
    harness.docsSelectChain.single.mockResolvedValue({
      data: {
        id: DOCUMENT_ID,
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        file_path: 'household-1/item-1/doc.pdf',
      },
      error: null,
    })
    harness.remove.mockResolvedValue({ data: null, error: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteItemDocument(HOUSEHOLD_ID, DOCUMENT_ID)

    expect(result.success).toBe(true)
    expect(harness.remove).toHaveBeenCalledWith(['household-1/item-1/doc.pdf'])
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/${ITEM_ID}`)
  })
})

