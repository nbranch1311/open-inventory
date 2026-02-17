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

import { adjustStockTo, recordReceiving, recordSale } from './movements'

const HOUSEHOLD_ID = 'household-1'

function buildClientHarness(options?: {
  userId?: string | null
  role?: string | null
  movementInsertError?: unknown
  stockRows?: Array<Record<string, unknown>>
}) {
  const userId = options?.userId === undefined ? 'user-1' : options.userId
  const role = options?.role === undefined ? 'owner' : options.role
  const movementInsertError = options?.movementInsertError ?? null
  const stockRows = options?.stockRows ?? [{ quantity_on_hand: 2 }]

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

  const movementsChain = {
    insert: vi.fn(() => movementsChain),
    select: vi.fn(() => movementsChain),
    single: vi.fn(async () => ({
      data: movementInsertError ? null : { id: 'move-1' },
      error: movementInsertError,
    })),
  }

  const stockChain: Record<string, unknown> = {}
  stockChain.select = vi.fn(() => stockChain)
  stockChain.eq = vi.fn(() => stockChain)
  stockChain.then = function (resolve: (v: { data: unknown; error: unknown }) => void) {
    queueMicrotask(() => resolve({ data: stockRows, error: null }))
    return Promise.resolve({ data: stockRows, error: null })
  }

  const from = vi.fn((table: string) => {
    if (table === 'household_members') return householdMembersChain
    if (table === 'inventory_movements') return movementsChain
    if (table === 'stock_on_hand') return stockChain
    if (table === 'products') throw new Error('Unexpected products query in movements test')
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null } })),
      },
      from,
    },
    movementsChain,
  }
}

describe('movement actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('recordReceiving rejects invalid quantity', async () => {
    const harness = buildClientHarness()
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await recordReceiving({
      householdId: HOUSEHOLD_ID,
      productId: 'product-1',
      roomId: null,
      quantity: 0,
    })

    expect(result).toMatchObject({ errorCode: 'invalid_input' })
  })

  it('recordSale uses negative quantity delta', async () => {
    const harness = buildClientHarness()
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await recordSale({
      householdId: HOUSEHOLD_ID,
      productId: 'product-1',
      roomId: null,
      quantity: 3,
    })

    expect(result.error).toBeNull()
    expect(harness.movementsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'sale',
        quantity_delta: -3,
      }),
    )
  })

  it('adjustStockTo returns invalid_input when no adjustment required', async () => {
    const harness = buildClientHarness({
      stockRows: [{ quantity_on_hand: 5 }],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await adjustStockTo({
      householdId: HOUSEHOLD_ID,
      productId: 'product-1',
      roomId: null,
      targetQuantity: 5,
    })

    expect(result).toMatchObject({ errorCode: 'invalid_input' })
  })
})

