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

import { createProduct, getProductsForHousehold, setProductActive } from './products'

const HOUSEHOLD_ID = 'household-1'

function buildClientHarness(options?: {
  userId?: string | null
  role?: string | null
  products?: Array<Record<string, unknown>>
  stockRows?: Array<Record<string, unknown>>
  insertResult?: { data: unknown; error: unknown }
  updateResult?: { data: unknown; error: unknown }
}) {
  const userId = options?.userId === undefined ? 'user-1' : options.userId
  const role = options?.role === undefined ? 'owner' : options.role
  const products = options?.products ?? []
  const stockRows = options?.stockRows ?? []
  const insertResult = options?.insertResult ?? { data: null, error: null }
  const updateResult = options?.updateResult ?? { data: null, error: null }

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

  const productsChain: Record<string, unknown> = {}
  productsChain.select = vi.fn(() => productsChain)
  productsChain.eq = vi.fn(() => productsChain)
  productsChain.order = vi.fn(async () => ({ data: products, error: null }))
  productsChain.insert = vi.fn(() => productsChain)
  productsChain.update = vi.fn(() => productsChain)
  productsChain.single = vi.fn(async () => insertResult)

  const productsUpdateChain: Record<string, unknown> = {}
  productsUpdateChain.update = vi.fn(() => productsUpdateChain)
  productsUpdateChain.eq = vi.fn(() => productsUpdateChain)
  productsUpdateChain.select = vi.fn(() => productsUpdateChain)
  productsUpdateChain.single = vi.fn(async () => updateResult)

  const stockChain: Record<string, unknown> = {}
  stockChain.select = vi.fn(() => stockChain)
  stockChain.eq = vi.fn(async () => ({ data: stockRows, error: null }))

  const from = vi.fn((table: string) => {
    if (table === 'household_members') return householdMembersChain
    if (table === 'stock_on_hand') return stockChain
    if (table === 'products') return productsChain
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null } })),
      },
      from,
    },
    from,
    productsChain,
    productsUpdateChain,
  }
}

describe('products actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getProductsForHousehold aggregates stock across rooms', async () => {
    const harness = buildClientHarness({
      products: [
        {
          id: 'product-1',
          household_id: HOUSEHOLD_ID,
          name: 'Almond Milk',
          sku: 'SKU-001',
          unit: 'pcs',
          is_active: true,
        },
      ],
      stockRows: [
        { product_id: 'product-1', quantity_on_hand: 2 },
        { product_id: 'product-1', quantity_on_hand: 3 },
      ],
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getProductsForHousehold(HOUSEHOLD_ID)

    expect(result).toEqual([
      expect.objectContaining({
        id: 'product-1',
        stockOnHand: 5,
      }),
    ])
  })

  it('createProduct returns unauthenticated when no session', async () => {
    const harness = buildClientHarness({ userId: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createProduct(HOUSEHOLD_ID, { name: 'Milk' })

    expect(result).toMatchObject({ errorCode: 'unauthenticated' })
  })

  it('createProduct returns forbidden when role cannot manage', async () => {
    const harness = buildClientHarness({ role: 'member' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createProduct(HOUSEHOLD_ID, { name: 'Milk' })

    expect(result).toMatchObject({ errorCode: 'forbidden' })
  })

  it('createProduct creates product when owner', async () => {
    const harness = buildClientHarness({
      insertResult: {
        data: {
          id: 'product-1',
          household_id: HOUSEHOLD_ID,
          name: 'Milk',
          sku: null,
          barcode: null,
          unit: 'pcs',
          is_active: true,
          created_at: 'now',
          updated_at: 'now',
        },
        error: null,
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createProduct(HOUSEHOLD_ID, { name: 'Milk', unit: 'pcs' })

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('product-1')
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it('setProductActive forbids when role cannot manage', async () => {
    const harness = buildClientHarness({ role: 'member' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await setProductActive(HOUSEHOLD_ID, 'product-1', false)

    expect(result).toMatchObject({ errorCode: 'forbidden' })
  })
})

