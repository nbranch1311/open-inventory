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
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  getInventoryItem,
  searchInventoryItems,
  updateInventoryItem,
} from './inventory'

const HOUSEHOLD_ID = 'household-1'
const ITEM_ID = 'item-1'

const mockItem = {
  id: ITEM_ID,
  household_id: HOUSEHOLD_ID,
  name: 'Test Item',
  description: null,
  quantity: 2,
  unit: 'pcs',
  category_id: null,
  location_id: null,
  status: 'active',
  expiry_date: null,
  purchase_date: null,
  created_at: '2026-02-14T00:00:00.000Z',
  updated_at: '2026-02-14T00:00:00.000Z',
}

function createSupabaseHarness(
  resolveValue: { data?: unknown; error: unknown } = { error: null },
) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockImplementation(() => chain)
  chain.insert = vi.fn().mockImplementation(() => chain)
  chain.update = vi.fn().mockImplementation(() => chain)
  chain.delete = vi.fn().mockImplementation(() => chain)
  chain.eq = vi.fn().mockImplementation(() => chain)
  chain.or = vi.fn().mockImplementation(() => chain)
  chain.order = vi.fn().mockImplementation(() => chain)
  chain.single = vi.fn()

  // Make chain awaitable (Supabase delete returns a thenable)
  chain.then = function (resolve: (v: { error: unknown }) => void) {
    queueMicrotask(() => resolve(resolveValue))
    return Promise.resolve(resolveValue)
  }
  chain.catch = function () {
    return chain
  }

  const from = vi.fn(() => chain)
  const client = { from }

  return { client, from, chain }
}

describe('searchInventoryItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches items scoped by household_id with default sort', async () => {
    const harness = createSupabaseHarness({ data: [mockItem], error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await searchInventoryItems(HOUSEHOLD_ID)

    expect(result.data).toEqual([mockItem])
    expect(result.error).toBeUndefined()
    expect(harness.from).toHaveBeenCalledWith('inventory_items')
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(harness.chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    expect(harness.chain.or).not.toHaveBeenCalled()
  })

  it('applies keyword search with or filter', async () => {
    const harness = createSupabaseHarness({ data: [mockItem], error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await searchInventoryItems(HOUSEHOLD_ID, {
      keyword: 'battery',
    })

    expect(result.data).toEqual([mockItem])
    expect(harness.chain.or).toHaveBeenCalledWith(
      'name.ilike.%battery%,description.ilike.%battery%',
    )
  })

  it('applies category and location filters', async () => {
    const harness = createSupabaseHarness({ data: [], error: null })
    const catId = 'cat-1'
    const locId = 'loc-1'

    mockCreateClient.mockResolvedValue(harness.client)

    await searchInventoryItems(HOUSEHOLD_ID, {
      categoryId: catId,
      locationId: locId,
    })

    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(harness.chain.eq).toHaveBeenCalledWith('category_id', catId)
    expect(harness.chain.eq).toHaveBeenCalledWith('location_id', locId)
  })

  it('sorts by name when sortBy is name', async () => {
    const harness = createSupabaseHarness({ data: [], error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    await searchInventoryItems(HOUSEHOLD_ID, {
      sortBy: 'name',
      sortOrder: 'asc',
    })

    expect(harness.chain.order).toHaveBeenCalledWith('name', {
      ascending: true,
    })
  })

  it('sorts by expiration when sortBy is expiration', async () => {
    const harness = createSupabaseHarness({ data: [], error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    await searchInventoryItems(HOUSEHOLD_ID, {
      sortBy: 'expiration',
      sortOrder: 'asc',
    })

    expect(harness.chain.order).toHaveBeenCalledWith('expiry_date', {
      ascending: true,
      nullsFirst: false,
    })
  })

  it('returns error on fetch failure', async () => {
    const harness = createSupabaseHarness({
      data: null,
      error: { message: 'DB error' },
    })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await searchInventoryItems(HOUSEHOLD_ID)

    expect(result.error).toBe('Failed to fetch inventory items')
    expect(result.data).toBeUndefined()
  })
})

describe('getInventoryItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches items scoped by household_id', async () => {
    const harness = createSupabaseHarness()
    harness.chain.order.mockResolvedValue({ data: [mockItem], error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getInventoryItems(HOUSEHOLD_ID)

    expect(result.data).toEqual([mockItem])
    expect(result.error).toBeUndefined()
    expect(harness.from).toHaveBeenCalledWith('inventory_items')
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
  })

  it('returns error on fetch failure', async () => {
    const harness = createSupabaseHarness()
    harness.chain.order.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getInventoryItems(HOUSEHOLD_ID)

    expect(result.error).toBe('Failed to fetch inventory items')
    expect(result.data).toBeUndefined()
  })
})

describe('getInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches single item scoped by id and household_id', async () => {
    const harness = createSupabaseHarness()
    harness.chain.single.mockResolvedValue({ data: mockItem, error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getInventoryItem(ITEM_ID, HOUSEHOLD_ID)

    expect(result.data).toEqual(mockItem)
    expect(result.error).toBeUndefined()
    expect(harness.chain.eq).toHaveBeenCalledWith('id', ITEM_ID)
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
  })

  it('returns error when item not found or not in household', async () => {
    const harness = createSupabaseHarness()
    harness.chain.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Row not found' },
    })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getInventoryItem(ITEM_ID, HOUSEHOLD_ID)

    expect(result.error).toBe('Failed to fetch inventory item')
    expect(result.data).toBeUndefined()
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
  })
})

describe('createInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when household_id mismatch', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Item',
      quantity: 1,
      unit: 'pcs',
      household_id: 'other-household',
    })

    expect(result.error).toBe('Household ID mismatch')
    expect(result.data).toBeUndefined()
  })

  it('returns error when name is empty', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: '',
      quantity: 1,
      unit: 'pcs',
    })

    expect(result.error).toBe('Name is required')
  })

  it('returns error when quantity is invalid', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Item',
      quantity: 0,
      unit: 'pcs',
    })

    expect(result.error).toBe('Quantity must be a positive number')
  })

  it('returns error when unit is empty', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Item',
      quantity: 1,
      unit: '',
    })

    expect(result.error).toBe('Unit is required')
  })

  it('inserts item and revalidates on success', async () => {
    const harness = createSupabaseHarness()
    harness.chain.single.mockResolvedValue({ data: mockItem, error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Test Item',
      quantity: 2,
      unit: 'pcs',
    })

    expect(result.data).toEqual(mockItem)
    expect(result.error).toBeUndefined()
    expect(harness.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Item',
        quantity: 2,
        unit: 'pcs',
        household_id: HOUSEHOLD_ID,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})

describe('updateInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates item scoped by household_id', async () => {
    const harness = createSupabaseHarness()
    const updatedItem = { ...mockItem, name: 'Updated Name' }
    harness.chain.single.mockResolvedValue({ data: updatedItem, error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      name: 'Updated Name',
      quantity: 3,
      unit: 'boxes',
    })

    expect(result.data).toEqual(updatedItem)
    expect(result.error).toBeUndefined()
    expect(harness.chain.eq).toHaveBeenCalledWith('id', ITEM_ID)
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/${ITEM_ID}`)
  })

  it('returns error when name is empty', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      name: '',
      quantity: 2,
      unit: 'pcs',
    })

    expect(result.error).toBe('Name is required')
    expect(result.data).toBeUndefined()
  })

  it('returns error when quantity is invalid', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      name: 'Item',
      quantity: 0,
      unit: 'pcs',
    })

    expect(result.error).toBe('Quantity must be a positive number')
    expect(result.data).toBeUndefined()
  })

  it('returns error when unit is empty', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      name: 'Item',
      quantity: 1,
      unit: '',
    })

    expect(result.error).toBe('Unit is required')
    expect(result.data).toBeUndefined()
  })

  it('returns error on DB failure', async () => {
    const harness = createSupabaseHarness()
    harness.chain.single.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      name: 'Updated',
      quantity: 1,
      unit: 'pcs',
    })

    expect(result.error).toBe('Failed to update inventory item')
    expect(result.data).toBeUndefined()
  })
})

describe('deleteInventoryItem', () => {
  beforeEach(() => {
    mockCreateClient.mockClear()
    mockRevalidatePath.mockClear()
  })

  it('deletes item scoped by household_id', async () => {
    const harness = createSupabaseHarness()
    // Chain uses built-in then resolving to { error: null }

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteInventoryItem(HOUSEHOLD_ID, ITEM_ID)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(harness.chain.eq).toHaveBeenCalledWith('id', ITEM_ID)
    expect(harness.chain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/${ITEM_ID}`)
  })

  it('returns error on delete failure', async () => {
    const harness = createSupabaseHarness({
      error: { message: 'Delete failed' },
    })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteInventoryItem(HOUSEHOLD_ID, ITEM_ID)

    expect(result.error).toBe('Failed to delete inventory item')
    expect(result.success).toBeUndefined()
  })
})
