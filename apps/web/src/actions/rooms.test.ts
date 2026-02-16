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

import { createRoom, deleteRoom, getRoomsForHousehold, renameRoom } from './rooms'

describe('getRoomsForHousehold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rooms scoped to household', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const from = vi.fn((table: string) => {
      if (table === 'household_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [{ role: 'owner' }], error: null })),
              })),
            })),
          })),
        }
      }
      if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [{ id: 'room-1', household_id: 'household-1', name: 'Kitchen' }],
                error: null,
              })),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await getRoomsForHousehold('household-1')

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual([{ id: 'room-1', household_id: 'household-1', name: 'Kitchen' }])
  })
})

describe('createRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when room limit reached for household', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const membershipSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [{ role: 'owner' }], error: null })),
        })),
      })),
    }))
    const roomCountSelect = vi.fn(() => ({
      eq: vi.fn(async () => ({ count: 10, error: null })),
    }))
    const from = vi.fn((table: string) => {
      if (table === 'household_members') return { select: membershipSelect }
      if (table === 'rooms') return { select: roomCountSelect }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await createRoom('household-1', 'Garage')

    expect(result).toEqual({
      data: null,
      error: 'Room limit reached (max 10 per inventory space)',
      errorCode: 'room_limit_reached',
    })
  })
})

describe('renameRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects empty room names', async () => {
    const result = await renameRoom('household-1', 'room-1', '   ')
    expect(result.errorCode).toBe('invalid_name')
  })
})

describe('deleteRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns warning_required when deleting non-empty room without confirmation', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const membershipSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [{ role: 'owner' }], error: null })),
        })),
      })),
    }))
    const countSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ count: 2, error: null })),
      })),
    }))
    const from = vi.fn((table: string) => {
      if (table === 'household_members') return { select: membershipSelect }
      if (table === 'inventory_items') return { select: countSelect }
      if (table === 'rooms') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(async () => ({ data: [{ id: 'room-1' }], error: null })),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })
    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await deleteRoom('household-1', 'room-1')

    expect(result).toEqual({
      success: false,
      error: 'Room contains items and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasItems: true,
        itemCount: 2,
      },
    })
  })

  it('returns room_not_found when delete affects zero rows', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } } }))
    const membershipSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [{ role: 'owner' }], error: null })),
        })),
      })),
    }))
    const countSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ count: 0, error: null })),
      })),
    }))
    const from = vi.fn((table: string) => {
      if (table === 'household_members') return { select: membershipSelect }
      if (table === 'inventory_items') return { select: countSelect }
      if (table === 'rooms') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })
    mockCreateClient.mockResolvedValue({ auth: { getUser: authGetUser }, from })

    const result = await deleteRoom('household-1', 'missing-room')

    expect(result).toEqual({
      success: false,
      error: 'Room not found',
      errorCode: 'room_not_found',
      warning: null,
    })
  })
})
