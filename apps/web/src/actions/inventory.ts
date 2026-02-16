'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
export type InsertItem = Omit<Database['public']['Tables']['inventory_items']['Insert'], 'id' | 'created_at' | 'updated_at'>
export type UpdateItem = Omit<Database['public']['Tables']['inventory_items']['Update'], 'id' | 'created_at' | 'updated_at' | 'household_id'>

export type InventorySortBy = 'recent' | 'name' | 'expiration'
export type InventorySortOrder = 'asc' | 'desc'

export type SearchInventoryParams = {
  keyword?: string
  categoryId?: string
  locationId?: string
  sortBy?: InventorySortBy
  sortOrder?: InventorySortOrder
}

type RoomRecord = Pick<Database['public']['Tables']['rooms']['Row'], 'id' | 'household_id'>

type MoveInventoryErrorCode =
  | 'unauthenticated'
  | 'destination_room_not_found'
  | 'destination_room_forbidden'
  | 'item_not_found'
  | 'source_item_forbidden'
  | 'move_failed'

type MoveInventoryResult = {
  success: boolean
  data?: Pick<InventoryItem, 'id' | 'household_id' | 'room_id'>
  error?: string
  errorCode?: MoveInventoryErrorCode
}

type BulkMoveFailureReason =
  | 'item_not_found_or_forbidden'
  | 'forbidden_source_household'
  | 'update_failed'

type BulkMoveFailure = {
  itemId: string
  reason: BulkMoveFailureReason
}

type BulkMoveInventoryResult = {
  success: boolean
  movedItemIds: string[]
  failures: BulkMoveFailure[]
  error?: string
  errorCode?:
    | 'invalid_input'
    | 'unauthenticated'
    | 'destination_room_not_found'
    | 'destination_room_forbidden'
    | 'validation_failed'
    | 'move_failed'
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function getRoomById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
): Promise<RoomRecord | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, household_id')
    .eq('id', roomId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function userCanAccessHousehold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  householdId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (error) {
    return false
  }

  return (data ?? []).length > 0
}

export async function searchInventoryItems(
  householdId: string,
  params: SearchInventoryParams = {},
): Promise<{ data?: InventoryItem[]; error?: string }> {
  const supabase = await createClient()

  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)

  const keyword = params.keyword?.trim()
  if (keyword) {
    const pattern = `%${keyword}%`
    query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`)
  }

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }
  if (params.locationId) {
    query = query.eq('location_id', params.locationId)
  }

  const sortBy = params.sortBy ?? 'recent'
  const sortOrder = params.sortOrder ?? 'desc'

  if (sortBy === 'name') {
    query = query.order('name', { ascending: sortOrder === 'asc' })
  } else if (sortBy === 'expiration') {
    query = query.order('expiry_date', { ascending: sortOrder === 'asc', nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: sortOrder === 'asc' })
  }

  const { data, error } = await query

  if (error) {
    console.error('Error searching inventory items:', error)
    return { error: 'Failed to fetch inventory items' }
  }

  return { data: data ?? [] }
}

export type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name'>
export type Location = Pick<Database['public']['Tables']['locations']['Row'], 'id' | 'name'>

export async function getCategoriesForHousehold(
  householdId: string,
): Promise<{ data?: Category[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return { error: 'Failed to fetch categories' }
  }
  return { data: data ?? [] }
}

export async function getLocationsForHousehold(
  householdId: string,
): Promise<{ data?: Location[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('id, name')
    .eq('household_id', householdId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching locations:', error)
    return { error: 'Failed to fetch locations' }
  }
  return { data: data ?? [] }
}

export async function getInventoryItems(householdId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inventory items:', error)
    return { error: 'Failed to fetch inventory items' }
  }

  return { data }
}

export async function getInventoryItem(itemId: string, householdId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .single()

  if (error) {
    console.error('Error fetching inventory item:', error)
    return { error: 'Failed to fetch inventory item' }
  }

  return { data }
}

export async function createInventoryItem(householdId: string, item: InsertItem) {
  const supabase = await createClient()

  // Validate householdId matches item.household_id if provided in item
  if (item.household_id && item.household_id !== householdId) {
    return { error: 'Household ID mismatch' }
  }

  // Validate required fields
  const name = (item.name ?? '').toString().trim()
  if (!name) {
    return { error: 'Name is required' }
  }
  const quantity = Number(item.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: 'Quantity must be a positive number' }
  }
  const unit = (item.unit ?? '').toString().trim()
  if (!unit) {
    return { error: 'Unit is required' }
  }
  const roomId = (item.room_id ?? '').toString().trim()
  if (!roomId) {
    return { error: 'Room is required' }
  }

  const userId = await getAuthenticatedUserId(supabase)
  if (!userId) {
    return { error: 'User not authenticated' }
  }

  const room = await getRoomById(supabase, roomId)
  if (!room || room.household_id !== householdId) {
    return { error: 'Room not found for inventory space' }
  }

  const hasAccess = await userCanAccessHousehold(supabase, userId, householdId)
  if (!hasAccess) {
    return { error: 'Access denied for inventory space' }
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ ...item, household_id: householdId, room_id: roomId })
    .select()
    .single()

  if (error) {
    console.error('Error creating inventory item:', error)
    return { error: 'Failed to create inventory item' }
  }

  revalidatePath('/dashboard')
  return { data }
}

export async function updateInventoryItem(householdId: string, itemId: string, item: UpdateItem) {
  const supabase = await createClient()

  // Validate fields when present (mirror createInventoryItem)
  if ('name' in item) {
    const name = (item.name ?? '').toString().trim()
    if (!name) {
      return { error: 'Name is required' }
    }
  }
  if ('quantity' in item) {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: 'Quantity must be a positive number' }
    }
  }
  if ('unit' in item) {
    const unit = (item.unit ?? '').toString().trim()
    if (!unit) {
      return { error: 'Unit is required' }
    }
  }
  if ('room_id' in item) {
    const roomId = (item.room_id ?? '').toString().trim()
    if (!roomId) {
      return { error: 'Room is required' }
    }

    const userId = await getAuthenticatedUserId(supabase)
    if (!userId) {
      return { error: 'User not authenticated' }
    }

    const room = await getRoomById(supabase, roomId)
    if (!room || room.household_id !== householdId) {
      return { error: 'Room not found for inventory space' }
    }

    const hasAccess = await userCanAccessHousehold(supabase, userId, householdId)
    if (!hasAccess) {
      return { error: 'Access denied for inventory space' }
    }

    item = {
      ...item,
      room_id: roomId,
    }
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update(item)
    .eq('id', itemId)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) {
    console.error('Error updating inventory item:', error)
    return { error: 'Failed to update inventory item' }
  }

  if (data) {
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/${data.id}`)
  }

  return { data }
}

export async function deleteInventoryItem(householdId: string, itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId)
    .eq('household_id', householdId)

  if (error) {
    console.error('Error deleting inventory item:', error)
    return { error: 'Failed to delete inventory item' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${itemId}`)
  return { success: true }
}

export async function moveInventoryItem(
  itemId: string,
  destinationRoomId: string,
): Promise<MoveInventoryResult> {
  const supabase = await createClient()
  const userId = await getAuthenticatedUserId(supabase)

  if (!userId) {
    return {
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const destinationRoom = await getRoomById(supabase, destinationRoomId)
  if (!destinationRoom) {
    return {
      success: false,
      error: 'Destination room not found',
      errorCode: 'destination_room_not_found',
    }
  }

  const canAccessDestination = await userCanAccessHousehold(
    supabase,
    userId,
    destinationRoom.household_id,
  )
  if (!canAccessDestination) {
    return {
      success: false,
      error: 'Cannot access destination inventory space',
      errorCode: 'destination_room_forbidden',
    }
  }

  const { data: sourceItem, error: sourceError } = await supabase
    .from('inventory_items')
    .select('id, household_id, room_id')
    .eq('id', itemId)
    .single()

  if (sourceError || !sourceItem) {
    return {
      success: false,
      error: 'Item not found',
      errorCode: 'item_not_found',
    }
  }

  const canAccessSource = await userCanAccessHousehold(supabase, userId, sourceItem.household_id)
  if (!canAccessSource) {
    return {
      success: false,
      error: 'Cannot access source item inventory space',
      errorCode: 'source_item_forbidden',
    }
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from('inventory_items')
    .update({
      household_id: destinationRoom.household_id,
      room_id: destinationRoom.id,
    })
    .eq('id', sourceItem.id)
    .eq('household_id', sourceItem.household_id)
    .select('id, household_id, room_id')
    .single()

  if (updateError || !updatedItem) {
    return {
      success: false,
      error: 'Failed to move item',
      errorCode: 'move_failed',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${itemId}`)
  return {
    success: true,
    data: updatedItem,
  }
}

export async function bulkMoveInventoryItems(
  itemIds: string[],
  destinationRoomId: string,
): Promise<BulkMoveInventoryResult> {
  const normalizedItemIds = Array.from(
    new Set(itemIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  )
  if (normalizedItemIds.length === 0) {
    return {
      success: false,
      movedItemIds: [],
      failures: [],
      error: 'At least one item is required',
      errorCode: 'invalid_input',
    }
  }

  const supabase = await createClient()
  const userId = await getAuthenticatedUserId(supabase)
  if (!userId) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'item_not_found_or_forbidden',
      })),
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const destinationRoom = await getRoomById(supabase, destinationRoomId)
  if (!destinationRoom) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'item_not_found_or_forbidden',
      })),
      error: 'Destination room not found',
      errorCode: 'destination_room_not_found',
    }
  }

  const canAccessDestination = await userCanAccessHousehold(
    supabase,
    userId,
    destinationRoom.household_id,
  )
  if (!canAccessDestination) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'item_not_found_or_forbidden',
      })),
      error: 'Cannot access destination inventory space',
      errorCode: 'destination_room_forbidden',
    }
  }

  const { data: sourceItems, error: sourceItemsError } = await supabase
    .from('inventory_items')
    .select('id, household_id, room_id')
    .in('id', normalizedItemIds)

  if (sourceItemsError) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'update_failed',
      })),
      error: 'Failed to validate source items',
      errorCode: 'move_failed',
    }
  }

  const sourceItemMap = new Map((sourceItems ?? []).map((item) => [item.id, item]))
  const sourceHouseholdIds = Array.from(new Set((sourceItems ?? []).map((item) => item.household_id)))
  const { data: memberRows, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .in('household_id', sourceHouseholdIds)

  if (memberError) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'update_failed',
      })),
      error: 'Failed to validate ownership',
      errorCode: 'move_failed',
    }
  }

  const accessibleSourceHouseholdIds = new Set((memberRows ?? []).map((row) => row.household_id))
  const failures: BulkMoveFailure[] = []
  for (const itemId of normalizedItemIds) {
    const sourceItem = sourceItemMap.get(itemId)
    if (!sourceItem) {
      failures.push({
        itemId,
        reason: 'item_not_found_or_forbidden',
      })
      continue
    }

    if (!accessibleSourceHouseholdIds.has(sourceItem.household_id)) {
      failures.push({
        itemId,
        reason: 'forbidden_source_household',
      })
    }
  }

  if (failures.length > 0) {
    return {
      success: false,
      movedItemIds: [],
      failures,
      error: 'One or more items failed validation',
      errorCode: 'validation_failed',
    }
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('inventory_items')
    .update({
      household_id: destinationRoom.household_id,
      room_id: destinationRoom.id,
    })
    .in('id', normalizedItemIds)
    .select('id')

  if (updateError) {
    return {
      success: false,
      movedItemIds: [],
      failures: normalizedItemIds.map((itemId) => ({
        itemId,
        reason: 'update_failed',
      })),
      error: 'Failed to move items',
      errorCode: 'move_failed',
    }
  }

  const updatedItemIds = (updatedRows ?? []).map((row) => row.id)
  if (updatedItemIds.length !== normalizedItemIds.length) {
    const updatedItemIdSet = new Set(updatedItemIds)
    const unresolvedIds = normalizedItemIds.filter((itemId) => !updatedItemIdSet.has(itemId))
    return {
      success: false,
      movedItemIds: updatedItemIds,
      failures: unresolvedIds.map((itemId) => ({
        itemId,
        reason: 'update_failed',
      })),
      error: 'Move operation completed with unresolved items',
      errorCode: 'move_failed',
    }
  }

  revalidatePath('/dashboard')
  return {
    success: true,
    movedItemIds: updatedItemIds,
    failures: [],
  }
}
