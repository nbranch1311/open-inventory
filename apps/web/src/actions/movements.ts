'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row']

type MovementType = 'receive' | 'sale' | 'adjust' | 'init' | 'transfer_in' | 'transfer_out'

type MovementResult = {
  data: InventoryMovement | null
  error: string | null
  errorCode: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'create_failed' | null
}

type StockOnHandRow = Database['public']['Views']['stock_on_hand']['Row']

async function getUserRoleForHousehold(
  supabase: Awaited<ReturnType<typeof getServerAuthContext>>['supabase'],
  userId: string,
  householdId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (error || !data?.[0]) {
    return null
  }

  return data[0].role
}

function canManageMovements(role: string | null): boolean {
  return role === 'owner' || role === 'admin'
}

async function insertMovement(params: {
  householdId: string
  productId: string
  roomId: string | null
  movementType: MovementType
  quantityDelta: number
  createdBy: string
  note?: string
  sourceType?: string
  sourceId?: string
}): Promise<MovementResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const role = await getUserRoleForHousehold(supabase, userId, params.householdId)
  if (!canManageMovements(role)) {
    return { data: null, error: 'Access denied', errorCode: 'forbidden' }
  }

  if (!Number.isFinite(params.quantityDelta) || params.quantityDelta === 0) {
    return { data: null, error: 'Quantity delta must be non-zero', errorCode: 'invalid_input' }
  }

  const { data, error } = await supabase
    .from('inventory_movements')
    .insert({
      household_id: params.householdId,
      product_id: params.productId,
      room_id: params.roomId,
      movement_type: params.movementType,
      quantity_delta: params.quantityDelta,
      created_by: params.createdBy,
      note: params.note ?? null,
      source_type: params.sourceType ?? null,
      source_id: params.sourceId ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('Error creating movement:', error)
    return { data: null, error: 'Failed to create movement', errorCode: 'create_failed' }
  }

  revalidatePath('/dashboard/business')
  return { data, error: null, errorCode: null }
}

export async function recordReceiving(params: {
  householdId: string
  productId: string
  roomId: string | null
  quantity: number
  note?: string
}): Promise<MovementResult> {
  const { userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const quantity = Number(params.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { data: null, error: 'Quantity must be a positive number', errorCode: 'invalid_input' }
  }

  return insertMovement({
    householdId: params.householdId,
    productId: params.productId,
    roomId: params.roomId,
    movementType: 'receive',
    quantityDelta: quantity,
    createdBy: userId,
    note: params.note,
  })
}

export async function recordSale(params: {
  householdId: string
  productId: string
  roomId: string | null
  quantity: number
  note?: string
  sourceType?: string
  sourceId?: string
}): Promise<MovementResult> {
  const { userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const quantity = Number(params.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { data: null, error: 'Quantity must be a positive number', errorCode: 'invalid_input' }
  }

  return insertMovement({
    householdId: params.householdId,
    productId: params.productId,
    roomId: params.roomId,
    movementType: 'sale',
    quantityDelta: -quantity,
    createdBy: userId,
    note: params.note,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
  })
}

export async function adjustStockTo(params: {
  householdId: string
  productId: string
  roomId: string | null
  targetQuantity: number
  note?: string
}): Promise<MovementResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const role = await getUserRoleForHousehold(supabase, userId, params.householdId)
  if (!canManageMovements(role)) {
    return { data: null, error: 'Access denied', errorCode: 'forbidden' }
  }

  const targetQuantity = Number(params.targetQuantity)
  if (!Number.isFinite(targetQuantity) || targetQuantity < 0) {
    return { data: null, error: 'Target quantity must be 0 or greater', errorCode: 'invalid_input' }
  }

  const stockQuery = supabase
    .from('stock_on_hand')
    .select('*')
    .eq('household_id', params.householdId)
    .eq('product_id', params.productId)

  const { data: stockRows, error: stockError } = params.roomId
    ? await stockQuery.eq('room_id', params.roomId)
    : await stockQuery

  if (stockError) {
    console.error('Error fetching stock_on_hand:', stockError)
  }

  const rows = (stockRows ?? []) as StockOnHandRow[]
  const currentOnHand = rows.reduce((sum, row) => sum + Number(row.quantity_on_hand ?? 0), 0)
  const delta = targetQuantity - currentOnHand

  if (delta === 0) {
    return { data: null, error: 'No adjustment required', errorCode: 'invalid_input' }
  }

  const { data, error } = await supabase
    .from('inventory_movements')
    .insert({
      household_id: params.householdId,
      product_id: params.productId,
      room_id: params.roomId,
      movement_type: 'adjust',
      quantity_delta: delta,
      created_by: userId,
      note: params.note ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('Error creating adjustment movement:', error)
    return { data: null, error: 'Failed to create adjustment', errorCode: 'create_failed' }
  }

  revalidatePath('/dashboard/business')
  return { data, error: null, errorCode: null }
}

