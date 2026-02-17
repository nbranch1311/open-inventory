import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))
const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  getServerAuthContext: async () => {
    const supabase = await mockCreateClient()
    const result = await supabase.auth.getUser()
    const user = result?.data?.user ?? null
    return { supabase, userId: user?.id ?? null, email: null, error: null }
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { importStockSnapshotCsv } from './csv-import'

const HOUSEHOLD_ID = 'household-1'

function buildClientHarness(options?: {
  userId?: string | null
  role?: string | null
  rooms?: Array<Record<string, unknown>>
}) {
  const userId = options?.userId === undefined ? 'user-1' : options.userId
  const role = options?.role === undefined ? 'owner' : options.role
  const rooms = options?.rooms ?? []

  const householdMembersChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: role ? [{ role }] : [],
            error: null,
          })),
        })),
      })),
    })),
  }

  const roomsSelectChain = {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: rooms,
        error: null,
      })),
    })),
  }

  const roomsInsertChain = {
    insert: vi.fn(() => roomsInsertChain),
    select: vi.fn(() => roomsInsertChain),
    single: vi.fn(async () => ({
      data: { id: 'room-1', name: 'Backroom' },
      error: null,
    })),
  }

  const productsUpsertChain = {
    upsert: vi.fn(() => productsUpsertChain),
    select: vi.fn(() => productsUpsertChain),
    single: vi.fn(async () => ({
      data: { id: 'product-1' },
      error: null,
    })),
  }

  const stockSelectChain = {
    select: vi.fn(() => stockSelectChain),
    eq: vi.fn(() => stockSelectChain),
    then: function (resolve: (v: { data: unknown; error: unknown }) => void) {
      queueMicrotask(() => resolve({ data: [{ quantity_on_hand: 0 }], error: null }))
      return Promise.resolve({ data: [{ quantity_on_hand: 0 }], error: null })
    },
  }

  const movementsChain = {
    insert: vi.fn(async () => ({ data: null, error: null })),
  }

  const from = vi.fn((table: string) => {
    if (table === 'household_members') return householdMembersChain
    if (table === 'rooms') {
      return {
        select: roomsSelectChain.select,
        insert: vi.fn(() => roomsInsertChain),
      }
    }
    if (table === 'products') return productsUpsertChain
    if (table === 'stock_on_hand') return stockSelectChain
    if (table === 'inventory_movements') return movementsChain
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null } })),
      },
      from,
    },
  }
}

describe('importStockSnapshotCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invalid_input when header is missing required columns', async () => {
    const harness = buildClientHarness()
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await importStockSnapshotCsv({
      householdId: HOUSEHOLD_ID,
      csvText: 'sku,name\nSKU-1,Milk\n',
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('invalid_input')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('imports a minimal stock snapshot successfully', async () => {
    const harness = buildClientHarness()
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await importStockSnapshotCsv({
      householdId: HOUSEHOLD_ID,
      csvText: 'sku,name,room,quantity_on_hand\nSKU-1,Milk,Backroom,3\n',
    })

    expect(result.success).toBe(true)
    expect(result.importedRows).toBe(1)
    expect(result.createdRooms).toBe(1)
    expect(result.createdMovements).toBe(1)
  })
})

