'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
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
  | 'household_limit_reached'
  | 'household_membership_missing'
  | 'unknown_auth_error'

type CreateHouseholdResult = {
  data: HouseholdRecord | null
  error: string | null
  errorCode: CreateHouseholdErrorCode | null
}

type MembershipWithHousehold = {
  household_id: string
  role: string | null
  households: {
    id: string
    name: string
    created_at: string
  } | null
}

type InventorySpaceSettings = {
  id: string
  name: string
  createdAt: string
  memberRole: string | null
  isOwner: boolean
}

type InventorySpaceSettingsResult = {
  data: InventorySpaceSettings | null
  error: string | null
  errorCode: 'unauthenticated' | 'inventory_space_not_found' | 'unknown_error' | null
}

type RenameInventorySpaceResult = {
  data: { id: string; name: string; updated_at: string } | null
  error: string | null
  errorCode:
    | 'unauthenticated'
    | 'inventory_space_not_found'
    | 'forbidden_not_owner'
    | 'invalid_name'
    | 'update_failed'
    | null
}

type DeleteInventorySpaceWarning = {
  hasRooms: boolean
  roomCount: number
}

type DeleteInventorySpaceOptions = {
  confirmHasRooms?: boolean
}

type DeleteSelectedInventorySpaceResult = {
  success: boolean
  error: string | null
  errorCode:
    | 'unauthenticated'
    | 'inventory_space_not_found'
    | 'forbidden_not_owner'
    | 'warning_required'
    | 'delete_failed'
    | null
  warning: DeleteInventorySpaceWarning | null
}

export type DeleteInventorySpaceBlockedBy = {
  inventoryItems: boolean
  itemDocuments: boolean
  itemReminders: boolean
}

type DeleteInventorySpaceResult = {
  success: boolean
  error: string | null
  errorCode:
    | 'unauthenticated'
    | 'inventory_space_not_found'
    | 'forbidden_not_owner'
    | 'confirmation_mismatch'
    | 'delete_blocked_has_data'
    | 'delete_failed'
    | null
  blockedBy: DeleteInventorySpaceBlockedBy | null
}

const CREATE_HOUSEHOLD_MESSAGES = {
  unauthenticated: 'User not authenticated',
  rlsHouseholdDenied: "We couldn't create your inventory space right now. Please try again.",
  householdLimitReached: 'Inventory space limit reached (max 5)',
  membershipMissing: "We couldn't finish account setup. Please retry.",
  unknown: 'Something went wrong. Please try again.',
} as const

const isMembershipMissingSignal = (values: Array<string | null | undefined>) =>
  values.some((value) =>
    value?.toLowerCase().includes('household_membership_missing')
  )

const isHouseholdLimitSignal = (values: Array<string | null | undefined>) =>
  values.some((value) => value?.toLowerCase().includes('household_limit_reached'))

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

async function getCurrentMembershipWithHousehold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households (id, name, created_at)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)

  if (error) {
    return { data: null, error }
  }

  const membership = (data?.[0] ?? null) as MembershipWithHousehold | null
  if (!membership?.households) {
    return { data: null, error: null }
  }

  return { data: membership, error: null }
}

async function getMembershipForHousehold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  householdId: string,
) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households (id, name, created_at)')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (error) {
    return { data: null, error }
  }

  const membership = (data?.[0] ?? null) as MembershipWithHousehold | null
  if (!membership?.households) {
    return { data: null, error: null }
  }

  return { data: membership, error: null }
}

export async function createHousehold(name: string) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? 'unknown-request-id'

  try {
    const { supabase, userId } = await getServerAuthContext()
    if (!userId) {
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
      const isHouseholdLimitReached =
        householdError?.code === '23514' &&
        isHouseholdLimitSignal([
          householdError?.code,
          householdError?.message,
          householdError?.details,
          householdError?.hint,
        ])
      const errorCode: CreateHouseholdErrorCode = isRlsDenied
        ? '42501_rls_households'
        : isHouseholdLimitReached
          ? 'household_limit_reached'
        : isMembershipMissing
          ? 'household_membership_missing'
          : 'unknown_auth_error'

      logCreateHouseholdFailure({
        requestId,
        userId,
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
            : errorCode === 'household_limit_reached'
              ? CREATE_HOUSEHOLD_MESSAGES.householdLimitReached
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
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return []
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('role, households (*)')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user households:', error)
    return []
  }

  return data.map((member) => ({
    ...member.households,
    role: member.role,
  }))
}

export async function getInventorySpaceSettings(
  spaceId: string,
): Promise<InventorySpaceSettingsResult> {
  try {
    const { supabase, userId } = await getServerAuthContext()
    if (!userId) {
      return {
        data: null,
        error: 'User not authenticated',
        errorCode: 'unauthenticated',
      }
    }

    const membershipResult = await getMembershipForHousehold(supabase, userId, spaceId)
    if (membershipResult.error || !membershipResult.data?.households) {
      return {
        data: null,
        error: 'Inventory space not found',
        errorCode: 'inventory_space_not_found',
      }
    }

    return {
      data: {
        id: membershipResult.data.households.id,
        name: membershipResult.data.households.name,
        createdAt: membershipResult.data.households.created_at,
        memberRole: membershipResult.data.role,
        isOwner: membershipResult.data.role === 'owner',
      },
      error: null,
      errorCode: null,
    }
  } catch (error) {
    console.error('[inventorySpace.settings] failure', error)
    return {
      data: null,
      error: 'Something went wrong. Please try again.',
      errorCode: 'unknown_error',
    }
  }
}

export async function renameInventorySpace(
  spaceId: string,
  nextName: string,
): Promise<RenameInventorySpaceResult> {
  const trimmedName = nextName.trim()
  if (!trimmedName) {
    return {
      data: null,
      error: 'Inventory space name is required',
      errorCode: 'invalid_name',
    }
  }

  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      data: null,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const membershipResult = await getMembershipForHousehold(supabase, userId, spaceId)
  if (membershipResult.error || !membershipResult.data?.households) {
    return {
      data: null,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
    }
  }

  if (membershipResult.data.role !== 'owner') {
    return {
      data: null,
      error: 'Only owners can rename this inventory space',
      errorCode: 'forbidden_not_owner',
    }
  }

  const { data, error } = await supabase
    .from('households')
    .update({ name: trimmedName })
    .eq('id', spaceId)
    .select('id, name, updated_at')
    .single()

  if (error || !data) {
    return {
      data: null,
      error: 'Failed to rename inventory space',
      errorCode: 'update_failed',
    }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return {
    data,
    error: null,
    errorCode: null,
  }
}

export async function deleteInventorySpace(
  spaceId: string,
  opts: DeleteInventorySpaceOptions = {},
): Promise<DeleteSelectedInventorySpaceResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
      warning: null,
    }
  }

  const membershipResult = await getMembershipForHousehold(supabase, userId, spaceId)
  if (membershipResult.error || !membershipResult.data?.households) {
    return {
      success: false,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
      warning: null,
    }
  }

  if (membershipResult.data.role !== 'owner') {
    return {
      success: false,
      error: 'Only owners can delete this inventory space',
      errorCode: 'forbidden_not_owner',
      warning: null,
    }
  }

  const { count: roomCount, error: roomCountError } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', spaceId)

  if (roomCountError) {
    return {
      success: false,
      error: 'Failed to evaluate inventory space delete policy',
      errorCode: 'delete_failed',
      warning: null,
    }
  }

  const resolvedRoomCount = roomCount ?? 0
  if (resolvedRoomCount > 0 && !opts.confirmHasRooms) {
    return {
      success: false,
      error: 'Inventory space contains rooms and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasRooms: true,
        roomCount: resolvedRoomCount,
      },
    }
  }

  const { data: deletedHouseholds, error } = await supabase
    .from('households')
    .delete()
    .eq('id', spaceId)
    .select('id')

  if (error) {
    return {
      success: false,
      error: 'Failed to delete inventory space',
      errorCode: 'delete_failed',
      warning: null,
    }
  }

  if (!deletedHouseholds || deletedHouseholds.length === 0) {
    return {
      success: false,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
      warning: null,
    }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return {
    success: true,
    error: null,
    errorCode: null,
    warning: null,
  }
}

export async function getCurrentInventorySpaceSettings(): Promise<InventorySpaceSettingsResult> {
  try {
    const { supabase, userId } = await getServerAuthContext()
    if (!userId) {
      return {
        data: null,
        error: 'User not authenticated',
        errorCode: 'unauthenticated',
      }
    }

    const membershipResult = await getCurrentMembershipWithHousehold(supabase, userId)
    if (membershipResult.error || !membershipResult.data?.households) {
      return {
        data: null,
        error: 'Inventory space not found',
        errorCode: 'inventory_space_not_found',
      }
    }

    return {
      data: {
        id: membershipResult.data.households.id,
        name: membershipResult.data.households.name,
        createdAt: membershipResult.data.households.created_at,
        memberRole: membershipResult.data.role,
        isOwner: membershipResult.data.role === 'owner',
      },
      error: null,
      errorCode: null,
    }
  } catch (error) {
    console.error('[inventorySpace.settings] failure', error)
    return {
      data: null,
      error: 'Something went wrong. Please try again.',
      errorCode: 'unknown_error',
    }
  }
}

export async function renameCurrentInventorySpace(
  nextName: string,
): Promise<RenameInventorySpaceResult> {
  const trimmedName = nextName.trim()
  if (!trimmedName) {
    return {
      data: null,
      error: 'Inventory space name is required',
      errorCode: 'invalid_name',
    }
  }

  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      data: null,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const membershipResult = await getCurrentMembershipWithHousehold(supabase, userId)
  if (membershipResult.error || !membershipResult.data?.households) {
    return {
      data: null,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
    }
  }

  if (membershipResult.data.role !== 'owner') {
    return {
      data: null,
      error: 'Only owners can rename this inventory space',
      errorCode: 'forbidden_not_owner',
    }
  }

  const { data, error } = await supabase
    .from('households')
    .update({ name: trimmedName })
    .eq('id', membershipResult.data.households.id)
    .select('id, name, updated_at')
    .single()

  if (error || !data) {
    return {
      data: null,
      error: 'Failed to rename inventory space',
      errorCode: 'update_failed',
    }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return {
    data,
    error: null,
    errorCode: null,
  }
}

export async function deleteCurrentInventorySpace(
  confirmationName: string,
): Promise<DeleteInventorySpaceResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
      blockedBy: null,
    }
  }

  const membershipResult = await getCurrentMembershipWithHousehold(supabase, userId)
  if (membershipResult.error || !membershipResult.data?.households) {
    return {
      success: false,
      error: 'Inventory space not found',
      errorCode: 'inventory_space_not_found',
      blockedBy: null,
    }
  }

  if (membershipResult.data.role !== 'owner') {
    return {
      success: false,
      error: 'Only owners can delete this inventory space',
      errorCode: 'forbidden_not_owner',
      blockedBy: null,
    }
  }

  const inventorySpaceName = membershipResult.data.households.name
  if (confirmationName !== inventorySpaceName) {
    return {
      success: false,
      error: 'Type the inventory space name exactly to confirm deletion',
      errorCode: 'confirmation_mismatch',
      blockedBy: null,
    }
  }

  const householdId = membershipResult.data.households.id
  const [itemsCountRes, docsCountRes, remindersCountRes] = await Promise.all([
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
    supabase.from('item_documents').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
    supabase.from('item_reminders').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
  ])

  const blockedBy = {
    inventoryItems: (itemsCountRes.count ?? 0) > 0,
    itemDocuments: (docsCountRes.count ?? 0) > 0,
    itemReminders: (remindersCountRes.count ?? 0) > 0,
  }

  if (blockedBy.inventoryItems || blockedBy.itemDocuments || blockedBy.itemReminders) {
    return {
      success: false,
      error: 'Inventory space cannot be deleted while items, documents, or reminders still exist',
      errorCode: 'delete_blocked_has_data',
      blockedBy,
    }
  }

  const { error } = await supabase.from('households').delete().eq('id', householdId)

  if (error) {
    return {
      success: false,
      error: 'Failed to delete inventory space',
      errorCode: 'delete_failed',
      blockedBy: null,
    }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return {
    success: true,
    error: null,
    errorCode: null,
    blockedBy: null,
  }
}
