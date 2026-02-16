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
  bulkMoveInventoryItems,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  getInventoryItem,
  moveInventoryItem,
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
  room_id: 'room-1',
}

function createSupabaseHarness(resolveValue: { data?: unknown; error: unknown } = { error: null }) {
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

  const roomSelectSingle = vi.fn(async () => ({
    data: { id: 'room-1', household_id: HOUSEHOLD_ID },
    error: null,
  }))

  const roomChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: roomSelectSingle,
      })),
    })),
  }

  const householdMembersChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: [{ household_id: HOUSEHOLD_ID }],
            error: null,
          })),
        })),
      })),
    })),
  }

  const from = vi.fn((table: string) => {
    if (table === 'inventory_items') return chain
    if (table === 'rooms') return roomChain
    if (table === 'household_members') return householdMembersChain
    throw new Error(`Unexpected table: ${table}`)
  })
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from,
  }

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

  it('returns error when room_id is missing', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Item',
      quantity: 1,
      unit: 'pcs',
    })

    expect(result.error).toBe('Room is required')
  })

  it('inserts item and revalidates on success', async () => {
    const harness = createSupabaseHarness()
    harness.chain.single.mockResolvedValue({ data: mockItem, error: null })

    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createInventoryItem(HOUSEHOLD_ID, {
      name: 'Test Item',
      quantity: 2,
      unit: 'pcs',
      room_id: 'room-1',
    })

    expect(result.data).toEqual(mockItem)
    expect(result.error).toBeUndefined()
    expect(harness.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Item',
        quantity: 2,
        unit: 'pcs',
        household_id: HOUSEHOLD_ID,
        room_id: 'room-1',
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

  it('returns error when room_id is empty string', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseHarness().client)

    const result = await updateInventoryItem(HOUSEHOLD_ID, ITEM_ID, {
      room_id: '',
    })

    expect(result.error).toBe('Room is required')
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

describe('moveInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns deterministic error when destination room is missing', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const roomSingle = vi.fn(async () => ({ data: null, error: { message: 'Not found' } }))
    const from = vi.fn((table: string) => {
      if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: roomSingle,
            })),
          })),
        }
      }
      if (table === 'household_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [{ household_id: HOUSEHOLD_ID }], error: null })),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await moveInventoryItem(ITEM_ID, 'missing-room')

    expect(result).toEqual({
      success: false,
      error: 'Destination room not found',
      errorCode: 'destination_room_not_found',
    })
  })
})

describe('bulkMoveInventoryItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns explicit per-item failures when any source item is missing', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const roomSingle = vi.fn(async () => ({
      data: { id: 'dest-room', household_id: 'household-1' },
      error: null,
    }))
    const itemsSelect = vi.fn(async () => ({
      data: [{ id: 'item-1', household_id: 'household-1', room_id: 'room-a' }],
      error: null,
    }))
    const membersSelect = vi.fn(async () => ({
      data: [{ household_id: 'household-1' }],
      error: null,
    }))

    const from = vi.fn((table: string) => {
      if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: roomSingle,
            })),
          })),
        }
      }

      if (table === 'inventory_items') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => itemsSelect()),
          })),
        }
      }

      if (table === 'household_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [{ household_id: 'household-1' }], error: null })),
              })),
              in: vi.fn(() => membersSelect()),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await bulkMoveInventoryItems(['item-1', 'item-2'], 'dest-room')

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('validation_failed')
    expect(result.failures).toEqual([
      {
        itemId: 'item-2',
        reason: 'item_not_found_or_forbidden',
      },
    ])
    expect(result.movedItemIds).toEqual([])
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
