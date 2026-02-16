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

import { createHousehold } from './household'
import {
  deleteInventorySpace,
  deleteCurrentInventorySpace,
  getInventorySpaceSettings,
  getCurrentInventorySpaceSettings,
  renameInventorySpace,
  renameCurrentInventorySpace,
} from './household'

type PostgrestLikeError = {
  code: string
  message: string
  details: string | null
  hint: string | null
}

type SupabaseActionHarnessOptions = {
  userId?: string | null
  householdRpcResult?: {
    data: { id: string; name: string; created_at: string; updated_at: string } | null
    error: PostgrestLikeError | null
  }
  membershipResult?: {
    data: Array<{
      household_id: string
      role: string | null
      households: { id: string; name: string; created_at: string } | null
    }> | null
    error: PostgrestLikeError | null
  }
  householdUpdateResult?: {
    data: { id: string; name: string; updated_at: string } | null
    error: PostgrestLikeError | null
  }
  householdDeleteResult?: {
    data?: Array<{ id: string }> | null
    error: PostgrestLikeError | null
  }
  roomsCount?: number
  roomsCountError?: PostgrestLikeError | null
  inventoryItemsCount?: number
  itemDocumentsCount?: number
  itemRemindersCount?: number
}

function createSupabaseActionHarness(options: SupabaseActionHarnessOptions = {}) {
  const authGetUser = vi.fn(async () => ({
    data: { user: options.userId ? { id: options.userId } : null },
  }))

  const rpcSingle = vi.fn(async () => {
    if (options.householdRpcResult) {
      return options.householdRpcResult
    }

    return {
      data: {
        id: 'household-1',
        name: 'My Home',
        created_at: '2026-02-14T00:00:00.000Z',
        updated_at: '2026-02-14T00:00:00.000Z',
      },
      error: null,
    }
  })

  const rpc = vi.fn((fnName: string, args: { household_name: string }) => {
    if (fnName !== 'create_household_with_owner') {
      throw new Error(`Unexpected RPC in test: ${fnName}`)
    }

    if (!args.household_name) {
      throw new Error('Expected household_name argument to be passed')
    }

    return {
      single: rpcSingle,
    }
  })

  const membershipResult = options.membershipResult ?? {
    data: [
      {
        household_id: 'household-1',
        role: 'owner',
        households: {
          id: 'household-1',
          name: 'My Home',
          created_at: '2026-02-14T00:00:00.000Z',
        },
      },
    ],
    error: null,
  }

  const householdUpdateResult = options.householdUpdateResult ?? {
    data: {
      id: 'household-1',
      name: 'Renamed Space',
      updated_at: '2026-02-16T00:00:00.000Z',
    },
    error: null,
  }

  const householdDeleteResult = options.householdDeleteResult ?? {
    data: [{ id: 'household-1' }],
    error: null,
  }

  const makeAwaitableChain = (result: { data?: unknown; error: unknown; count?: number | null }) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn(async () => result)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn(async () => result)
    chain.then = (resolve: (value: typeof result) => void) => {
      queueMicrotask(() => resolve(result))
      return Promise.resolve(result)
    }
    chain.catch = () => chain
    return chain
  }

  const householdMembersChain = makeAwaitableChain({
    data: membershipResult.data,
    error: membershipResult.error,
  })
  const householdUpdateChain = makeAwaitableChain({
    data: householdUpdateResult.data,
    error: householdUpdateResult.error,
  })
  const householdDeleteChain = makeAwaitableChain({
    data: householdDeleteResult.data ?? null,
    error: householdDeleteResult.error,
  })
  const inventoryItemsCountChain = makeAwaitableChain({
    data: null,
    error: null,
    count: options.inventoryItemsCount ?? 0,
  })
  const roomsCountChain = makeAwaitableChain({
    data: null,
    error: options.roomsCountError ?? null,
    count: options.roomsCount ?? 0,
  })
  const itemDocumentsCountChain = makeAwaitableChain({
    data: null,
    error: null,
    count: options.itemDocumentsCount ?? 0,
  })
  const itemRemindersCountChain = makeAwaitableChain({
    data: null,
    error: null,
    count: options.itemRemindersCount ?? 0,
  })

  const householdsTable = {
    update: vi.fn(() => householdUpdateChain),
    delete: vi.fn(() => householdDeleteChain),
  }

  const from = vi.fn((tableName: string) => {
    if (tableName === 'household_members') return householdMembersChain
    if (tableName === 'households') return householdsTable
    if (tableName === 'rooms') return roomsCountChain
    if (tableName === 'inventory_items') return inventoryItemsCountChain
    if (tableName === 'item_documents') return itemDocumentsCountChain
    if (tableName === 'item_reminders') return itemRemindersCountChain
    throw new Error(`Unexpected table in test: ${tableName}`)
  })

  return {
    client: {
      auth: {
        getUser: authGetUser,
      },
      rpc,
      from,
    },
    spies: {
      rpc,
      rpcSingle,
      from,
      householdMembersChain,
      householdUpdateChain,
      householdsTable,
    },
  }
}

describe('createHousehold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated error when no user exists', async () => {
    const harness = createSupabaseActionHarness({ userId: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createHousehold('My Home')

    expect(result).toEqual({
      data: null,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    })
    expect(harness.spies.rpc).not.toHaveBeenCalled()
  })

  it('maps RPC permission denied (42501) to user-safe policy failure error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      householdRpcResult: {
        data: null,
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "households"',
          details: null,
          hint: null,
        },
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createHousehold('My Home')

    expect(result).toEqual({
      data: null,
      error: "We couldn't create your inventory space right now. Please try again.",
      errorCode: '42501_rls_households',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[onboarding.createHousehold] failure',
      expect.objectContaining({
        stage: 'household_create_rpc',
        errorCode: '42501_rls_households',
        userId: 'user-1',
        dbCode: '42501',
      }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('maps non-policy RPC failures to unknown_auth_error and safe copy', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      householdRpcResult: {
        data: null,
        error: {
          code: 'PGRST301',
          message: 'rpc failed unexpectedly',
          details: 'downstream function exception',
          hint: 'check logs',
        },
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createHousehold('My Home')

    expect(result).toEqual({
      data: null,
      error: 'Something went wrong. Please try again.',
      errorCode: 'unknown_auth_error',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[onboarding.createHousehold] failure',
      expect.objectContaining({
        stage: 'household_create_rpc',
        errorCode: 'unknown_auth_error',
        userId: 'user-1',
        dbCode: 'PGRST301',
      }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('maps household max-limit failure to deterministic limit message', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      householdRpcResult: {
        data: null,
        error: {
          code: '23514',
          message: 'household_limit_reached',
          details: null,
          hint: null,
        },
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createHousehold('My Home')

    expect(result).toEqual({
      data: null,
      error: 'Inventory space limit reached (max 5)',
      errorCode: 'household_limit_reached',
    })
  })

  it('returns success and revalidates root path after RPC success', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createHousehold('My Home')

    expect(result).toEqual({
      data: {
        id: 'household-1',
        name: 'My Home',
        created_at: '2026-02-14T00:00:00.000Z',
        updated_at: '2026-02-14T00:00:00.000Z',
      },
      error: null,
      errorCode: null,
    })
    expect(harness.spies.rpc).toHaveBeenCalledWith('create_household_with_owner', {
      household_name: 'My Home',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('getCurrentInventorySpaceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated when no user exists', async () => {
    const harness = createSupabaseActionHarness({ userId: null })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getCurrentInventorySpaceSettings()

    expect(result).toEqual({
      data: null,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    })
  })

  it('returns current inventory space settings payload for owner path', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getCurrentInventorySpaceSettings()

    expect(result).toEqual({
      data: {
        id: 'household-1',
        name: 'My Home',
        createdAt: '2026-02-14T00:00:00.000Z',
        memberRole: 'owner',
        isOwner: true,
      },
      error: null,
      errorCode: null,
    })
    expect(harness.spies.from).toHaveBeenCalledWith('household_members')
    expect(harness.spies.householdMembersChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })
})

describe('getInventorySpaceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns inventory_space_not_found when user is not a member of selected space', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      membershipResult: {
        data: [],
        error: null,
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getInventorySpaceSettings('household-2')

    expect(result).toEqual({
      data: null,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
    })
    expect(harness.spies.householdMembersChain.eq).toHaveBeenCalledWith('household_id', 'household-2')
  })
})

describe('renameCurrentInventorySpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects empty inventory space names', async () => {
    const result = await renameCurrentInventorySpace('   ')
    expect(result).toEqual({
      data: null,
      error: 'Inventory space name is required',
      errorCode: 'invalid_name',
    })
  })

  it('rejects non-owner membership deterministically', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      membershipResult: {
        data: [
          {
            household_id: 'household-1',
            role: 'member',
            households: {
              id: 'household-1',
              name: 'My Home',
              created_at: '2026-02-14T00:00:00.000Z',
            },
          },
        ],
        error: null,
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await renameCurrentInventorySpace('Renamed Space')

    expect(result).toEqual({
      data: null,
      error: 'Only owners can rename this inventory space',
      errorCode: 'forbidden_not_owner',
    })
    expect(harness.spies.householdsTable.update).not.toHaveBeenCalled()
  })

  it('renames current owner inventory space and revalidates', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await renameCurrentInventorySpace('Renamed Space')

    expect(result).toEqual({
      data: {
        id: 'household-1',
        name: 'Renamed Space',
        updated_at: '2026-02-16T00:00:00.000Z',
      },
      error: null,
      errorCode: null,
    })
    expect(harness.spies.householdsTable.update).toHaveBeenCalledWith({ name: 'Renamed Space' })
    expect(harness.spies.householdUpdateChain.eq).toHaveBeenCalledWith('id', 'household-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})

describe('renameInventorySpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renames selected inventory space by id for owner path', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await renameInventorySpace('household-2', 'Warehouse')

    expect(result).toEqual({
      data: {
        id: 'household-1',
        name: 'Renamed Space',
        updated_at: '2026-02-16T00:00:00.000Z',
      },
      error: null,
      errorCode: null,
    })
    expect(harness.spies.householdUpdateChain.eq).toHaveBeenCalledWith('id', 'household-2')
  })
})

describe('deleteCurrentInventorySpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires exact typed confirmation against current inventory space name', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteCurrentInventorySpace('Wrong Name')

    expect(result).toEqual({
      success: false,
      error: 'Type the inventory space name exactly to confirm deletion',
      errorCode: 'confirmation_mismatch',
      blockedBy: null,
    })
    expect(harness.spies.householdsTable.delete).not.toHaveBeenCalled()
  })

  it('blocks delete when data exists and returns UX-safe reason contract', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      inventoryItemsCount: 2,
      itemDocumentsCount: 1,
      itemRemindersCount: 0,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteCurrentInventorySpace('My Home')

    expect(result).toEqual({
      success: false,
      error: 'Inventory space cannot be deleted while items, documents, or reminders still exist',
      errorCode: 'delete_blocked_has_data',
      blockedBy: {
        inventoryItems: true,
        itemDocuments: true,
        itemReminders: false,
      },
    })
    expect(harness.spies.householdsTable.delete).not.toHaveBeenCalled()
  })

  it('rejects non-owner delete attempts', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      membershipResult: {
        data: [
          {
            household_id: 'household-1',
            role: 'member',
            households: {
              id: 'household-1',
              name: 'My Home',
              created_at: '2026-02-14T00:00:00.000Z',
            },
          },
        ],
        error: null,
      },
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteCurrentInventorySpace('My Home')

    expect(result).toEqual({
      success: false,
      error: 'Only owners can delete this inventory space',
      errorCode: 'forbidden_not_owner',
      blockedBy: null,
    })
    expect(harness.spies.householdsTable.delete).not.toHaveBeenCalled()
  })

  it('deletes inventory space only when owner confirmation matches and no dependent data exists', async () => {
    const harness = createSupabaseActionHarness({ userId: 'user-1' })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteCurrentInventorySpace('My Home')

    expect(result).toEqual({
      success: true,
      error: null,
      errorCode: null,
      blockedBy: null,
    })
    expect(harness.spies.householdsTable.delete).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})

describe('deleteInventorySpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns warning_required with deterministic warning payload when selected space has rooms', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      roomsCount: 2,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteInventorySpace('household-1')

    expect(result).toEqual({
      success: false,
      error: 'Inventory space contains rooms and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasRooms: true,
        roomCount: 2,
      },
    })
    expect(harness.spies.householdsTable.delete).not.toHaveBeenCalled()
  })

  it('deletes an empty selected space without typed-name confirmation requirement', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      roomsCount: 0,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteInventorySpace('household-1')

    expect(result).toEqual({
      success: true,
      error: null,
      errorCode: null,
      warning: null,
    })
    expect(harness.spies.householdsTable.delete).toHaveBeenCalledTimes(1)
  })

  it('allows explicit warning-confirmed delete for non-empty selected space', async () => {
    const harness = createSupabaseActionHarness({
      userId: 'user-1',
      roomsCount: 3,
    })
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await deleteInventorySpace('household-1', { confirmHasRooms: true })

    expect(result).toEqual({
      success: true,
      error: null,
      errorCode: null,
      warning: null,
    })
    expect(harness.spies.householdsTable.delete).toHaveBeenCalledTimes(1)
  })
})
