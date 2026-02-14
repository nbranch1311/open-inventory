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

  return {
    client: {
      auth: {
        getUser: authGetUser,
      },
      rpc,
    },
    spies: {
      rpc,
      rpcSingle,
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
      error: "We couldn't create your household right now. Please try again.",
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
