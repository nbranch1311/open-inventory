'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type HouseholdRecord = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

type CreateHouseholdErrorCode =
  | 'unauthenticated'
  | '42501_rls_households'
  | 'household_membership_missing'
  | 'unknown_auth_error'

type CreateHouseholdResult = {
  data: HouseholdRecord | null
  error: string | null
  errorCode: CreateHouseholdErrorCode | null
}

const CREATE_HOUSEHOLD_MESSAGES = {
  unauthenticated: 'User not authenticated',
  rlsHouseholdDenied: "We couldn't create your household right now. Please try again.",
  membershipMissing: "We couldn't finish account setup. Please retry.",
  unknown: 'Something went wrong. Please try again.',
} as const

const isMembershipMissingSignal = (values: Array<string | null | undefined>) =>
  values.some((value) =>
    value?.toLowerCase().includes('household_membership_missing')
  )

const logCreateHouseholdFailure = (payload: {
  requestId: string
  userId: string | null
  stage: 'auth' | 'household_create_rpc'
  errorCode: CreateHouseholdErrorCode
  dbCode?: string
  message?: string
  details?: string
  hint?: string
}) => {
  console.error('[onboarding.createHousehold] failure', payload)
}

export async function createHousehold(name: string) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? 'unknown-request-id'

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        data: null,
        error: CREATE_HOUSEHOLD_MESSAGES.unauthenticated,
        errorCode: 'unauthenticated',
      } satisfies CreateHouseholdResult
    }

    // 1) Create household + owner membership atomically in SQL.
    const { data: household, error: householdError } = await supabase
      .rpc('create_household_with_owner', { household_name: name })
      .single()

    if (householdError || !household) {
      const isRlsDenied = householdError?.code === '42501'
      const isMembershipMissing = isMembershipMissingSignal([
        householdError?.code,
        householdError?.message,
        householdError?.details,
        householdError?.hint,
      ])
      const errorCode: CreateHouseholdErrorCode = isRlsDenied
        ? '42501_rls_households'
        : isMembershipMissing
          ? 'household_membership_missing'
          : 'unknown_auth_error'

      logCreateHouseholdFailure({
        requestId,
        userId: user.id,
        stage: 'household_create_rpc',
        errorCode,
        dbCode: householdError?.code,
        message: householdError?.message,
        details: householdError?.details,
        hint: householdError?.hint,
      })

      return {
        data: null,
        error:
          errorCode === '42501_rls_households'
            ? CREATE_HOUSEHOLD_MESSAGES.rlsHouseholdDenied
            : errorCode === 'household_membership_missing'
              ? CREATE_HOUSEHOLD_MESSAGES.membershipMissing
              : CREATE_HOUSEHOLD_MESSAGES.unknown,
        errorCode,
      } satisfies CreateHouseholdResult
    }

    revalidatePath('/')
    return {
      data: household,
      error: null,
      errorCode: null,
    } satisfies CreateHouseholdResult
  } catch (error) {
    logCreateHouseholdFailure({
      requestId,
      userId: null,
      stage: 'auth',
      errorCode: 'unknown_auth_error',
      message: error instanceof Error ? error.message : 'Unexpected non-Error exception',
    })

    return {
      data: null,
      error: CREATE_HOUSEHOLD_MESSAGES.unknown,
      errorCode: 'unknown_auth_error',
    } satisfies CreateHouseholdResult
  }
}

export async function getUserHouseholds() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('role, households (*)')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching user households:', error)
    return []
  }

  return data.map((member) => ({
    ...member.households,
    role: member.role,
  }))
}
