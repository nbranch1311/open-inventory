import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
  getServerAuthContext: async () => {
    const supabase = await mockCreateClient()
    const result = await supabase.auth.getUser()
    const user = result?.data?.user ?? null
    return { supabase, userId: user?.id ?? null, email: null, error: null }
  },
}))

import { askInventoryAssistant } from './ai'

type ItemRow = {
  id: string
  household_id: string
  room_id: string | null
  name: string
  description: string | null
  quantity: number
  unit: string | null
  expiry_date: string | null
}

type ProductRow = {
  id: string
  household_id: string
  sku: string | null
  barcode: string | null
  name: string
  unit: string | null
  is_active: boolean
}

type StockRow = {
  household_id: string | null
  product_id: string | null
  room_id: string | null
  quantity_on_hand: number | null
}

function buildClientHarness(options?: {
  userId?: string | null
  membership?: boolean
  items?: ItemRow[]
  itemsError?: unknown
  workspaceType?: 'personal' | 'business'
  products?: ProductRow[]
  stockRows?: StockRow[]
}) {
  const userId = options?.userId === undefined ? 'user-1' : options.userId
  const membership = options?.membership === undefined ? true : options.membership
  const items = options?.items ?? []
  const itemsError = options?.itemsError ?? null
  const workspaceType = options?.workspaceType ?? 'personal'
  const products = options?.products ?? []
  const stockRows = options?.stockRows ?? []

  const itemsOrder = vi.fn(async () => ({
    data: items,
    error: itemsError,
  }))

  const itemsEq = vi.fn(() => ({
    order: itemsOrder,
  }))

  const membersLimit = vi.fn(async () => ({
    data: membership ? [{ household_id: 'household-1' }] : [],
    error: null,
  }))

  const membersEqHousehold = vi.fn(() => ({
    limit: membersLimit,
  }))

  const membersEqUser = vi.fn(() => ({
    eq: membersEqHousehold,
  }))

  const from = vi.fn((table: string) => {
    if (table === 'households') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { workspace_type: workspaceType },
              error: null,
            })),
          })),
        })),
      }
    }

    if (table === 'inventory_items') {
      return {
        select: vi.fn(() => ({
          eq: itemsEq,
        })),
      }
    }

    if (table === 'products') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: products,
                error: null,
              })),
            })),
          })),
        })),
      }
    }

    if (table === 'stock_on_hand') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({
            data: stockRows,
            error: null,
          })),
        })),
      }
    }

    if (table === 'household_members') {
      return {
        select: vi.fn(() => ({
          eq: membersEqUser,
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: userId ? { id: userId } : null,
          },
        })),
      },
      from,
    },
    from,
  }
}

describe('askInventoryAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated when no user session exists', async () => {
    const harness = buildClientHarness({ userId: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'Do I have batteries?',
    })

    expect(result).toEqual({
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    })
  })

  it('returns forbidden when user does not belong to household', async () => {
    const harness = buildClientHarness({ membership: false })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'What do I have?',
    })

    expect(result).toEqual({
      success: false,
      error: 'Access denied for inventory space',
      errorCode: 'forbidden_household',
    })
  })

  it('refuses destructive or purchasing requests', async () => {
    const harness = buildClientHarness({
      items: [
        {
          id: 'item-1',
          household_id: 'household-1',
          room_id: 'room-1',
          name: 'AA Batteries',
          description: null,
          quantity: 4,
          unit: 'pack',
          expiry_date: null,
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'Delete all expired items and order more batteries',
    })

    expect(result.success).toBe(true)
    expect(result.confidence).toBe('refuse')
    expect(result.answer).toContain('cannot perform destructive or purchasing actions')
    expect(result.citations).toEqual([])
  })

  it('returns grounded availability answer with evidence citations', async () => {
    const harness = buildClientHarness({
      items: [
        {
          id: 'item-battery',
          household_id: 'household-1',
          room_id: 'room-1',
          name: 'AA Batteries',
          description: 'Spare power cells',
          quantity: 2,
          unit: 'pack',
          expiry_date: null,
        },
        {
          id: 'item-salt',
          household_id: 'household-1',
          room_id: 'room-2',
          name: 'Sea Salt',
          description: null,
          quantity: 1,
          unit: 'kg',
          expiry_date: null,
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'Do I have batteries?',
    })

    expect(result.success).toBe(true)
    expect(result.confidence).toBe('high')
    expect(result.answer).toContain('AA Batteries')
    expect(result.answer).toContain('Evidence')
    expect(result.citations).toEqual([
      {
        entityType: 'item',
        itemId: 'item-battery',
        itemName: 'AA Batteries',
        quantity: 2,
        unit: 'pack',
        roomId: 'room-1',
        expiryDate: null,
      },
    ])
  })

  it('returns low-confidence uncertainty when no grounded match exists', async () => {
    const harness = buildClientHarness({
      items: [
        {
          id: 'item-salt',
          household_id: 'household-1',
          room_id: 'room-2',
          name: 'Sea Salt',
          description: null,
          quantity: 1,
          unit: 'kg',
          expiry_date: null,
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'Do I have toothbrushes?',
    })

    expect(result.success).toBe(true)
    expect(result.confidence).toBe('low')
    expect(result.answer).toContain("I couldn't find a grounded match")
    expect(result.clarifyingQuestion).toContain('item name')
    expect(result.citations).toEqual([])
  })

  it('answers business on-hand questions with product citations', async () => {
    const harness = buildClientHarness({
      workspaceType: 'business',
      items: [],
      products: [
        {
          id: 'product-1',
          household_id: 'household-1',
          sku: 'SKU-001',
          barcode: null,
          name: 'Almond Milk',
          unit: 'pcs',
          is_active: true,
        },
      ],
      stockRows: [
        {
          household_id: 'household-1',
          product_id: 'product-1',
          room_id: null,
          quantity_on_hand: 12,
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'How many Almond Milk do we have on hand?',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.confidence).toBe('high')
    expect(result.answer).toContain('Almond Milk')
    expect(result.citations).toEqual([
      {
        entityType: 'product',
        itemId: 'product-1',
        itemName: 'Almond Milk',
        quantity: 12,
        unit: 'pcs',
        roomId: null,
        expiryDate: null,
      },
    ])
  })

  it('returns business low-stock summary with restock suggestions', async () => {
    const harness = buildClientHarness({
      workspaceType: 'business',
      items: [],
      products: [
        {
          id: 'product-1',
          household_id: 'household-1',
          sku: 'SKU-001',
          barcode: null,
          name: 'Almond Milk',
          unit: 'pcs',
          is_active: true,
        },
      ],
      stockRows: [
        {
          household_id: 'household-1',
          product_id: 'product-1',
          room_id: null,
          quantity_on_hand: 1,
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'What is low stock right now?',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.answer.toLowerCase()).toContain('low stock')
    expect(result.suggestions).toEqual([
      expect.objectContaining({
        type: 'restock',
        itemId: 'product-1',
      }),
    ])
  })

  it('returns low-confidence prompt when business workspace has no products', async () => {
    const harness = buildClientHarness({
      workspaceType: 'business',
      items: [],
      products: [],
      stockRows: [],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'How many units on hand?',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.confidence).toBe('low')
    expect(result.clarifyingQuestion).toBeTruthy()
  })

  it('returns expiring-soon summary with reminder suggestions', async () => {
    const harness = buildClientHarness({
      items: [
        {
          id: 'item-milk',
          household_id: 'household-1',
          room_id: 'room-1',
          name: 'Milk',
          description: null,
          quantity: 1,
          unit: 'carton',
          expiry_date: '2026-02-20T00:00:00.000Z',
        },
        {
          id: 'item-rice',
          household_id: 'household-1',
          room_id: 'room-2',
          name: 'Rice',
          description: null,
          quantity: 1,
          unit: 'bag',
          expiry_date: '2026-03-15T00:00:00.000Z',
        },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await askInventoryAssistant('household-1', {
      question: 'What expires soon?',
    })

    expect(result.success).toBe(true)
    expect(result.confidence).toBe('high')
    expect(result.answer).toContain('expiring')
    expect(result.citations?.map((citation) => citation.itemId)).toContain('item-milk')
    expect(result.suggestions).toEqual([
      {
        type: 'reminder',
        itemId: 'item-milk',
        reason: 'Item expires within 7 days.',
      },
    ])
  })
})
