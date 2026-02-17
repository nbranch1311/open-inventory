'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type Room = Database['public']['Tables']['rooms']['Row']

type RoomResult = {
  data: Room | null
  error: string | null
  errorCode:
    | 'invalid_name'
    | 'unauthenticated'
    | 'forbidden'
    | 'room_limit_reached'
    | 'room_not_found'
    | 'create_failed'
    | 'update_failed'
    | null
}

type DeleteRoomResult = {
  success: boolean
  error: string | null
  errorCode:
    | 'unauthenticated'
    | 'forbidden'
    | 'warning_required'
    | 'room_not_found'
    | 'delete_failed'
    | null
  warning: {
    hasItems: boolean
    itemCount: number
  } | null
}

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

function canManageRooms(role: string | null): boolean {
  return role === 'owner' || role === 'admin'
}

export async function getRoomsForHousehold(
  householdId: string,
): Promise<{ data?: Room[]; error?: string }> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return { error: 'User not authenticated' }
  }

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!role) {
    return { error: 'Access denied for inventory space' }
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: 'Failed to fetch rooms' }
  }

  return { data: data ?? [] }
}

export async function createRoom(householdId: string, roomName: string): Promise<RoomResult> {
  const trimmedName = roomName.trim()
  if (!trimmedName) {
    return {
      data: null,
      error: 'Room name is required',
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

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!canManageRooms(role)) {
    return {
      data: null,
      error: 'You do not have permission to manage rooms for this inventory space',
      errorCode: 'forbidden',
    }
  }

  const { count, error: countError } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)

  if (countError) {
    return {
      data: null,
      error: 'Failed to create room',
      errorCode: 'create_failed',
    }
  }

  if ((count ?? 0) >= 10) {
    return {
      data: null,
      error: 'Room limit reached (max 10 per inventory space)',
      errorCode: 'room_limit_reached',
    }
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      household_id: householdId,
      name: trimmedName,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      data: null,
      error: 'Failed to create room',
      errorCode: 'create_failed',
    }
  }

  revalidatePath('/dashboard')
  return {
    data,
    error: null,
    errorCode: null,
  }
}

export async function renameRoom(
  householdId: string,
  roomId: string,
  roomName: string,
): Promise<RoomResult> {
  const trimmedName = roomName.trim()
  if (!trimmedName) {
    return {
      data: null,
      error: 'Room name is required',
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

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!canManageRooms(role)) {
    return {
      data: null,
      error: 'You do not have permission to manage rooms for this inventory space',
      errorCode: 'forbidden',
    }
  }

  const { data, error } = await supabase
    .from('rooms')
    .update({
      name: trimmedName,
    })
    .eq('id', roomId)
    .eq('household_id', householdId)
    .select('*')
    .single()

  if (error || !data) {
    return {
      data: null,
      error: 'Room not found',
      errorCode: 'room_not_found',
    }
  }

  revalidatePath('/dashboard')
  return {
    data,
    error: null,
    errorCode: null,
  }
}

export async function deleteRoom(
  householdId: string,
  roomId: string,
  opts: { confirmNonEmpty?: boolean } = {},
): Promise<DeleteRoomResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
      warning: null,
    }
  }

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!canManageRooms(role)) {
    return {
      success: false,
      error: 'You do not have permission to delete rooms for this inventory space',
      errorCode: 'forbidden',
      warning: null,
    }
  }

  const { count, error: countError } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('room_id', roomId)

  if (countError) {
    return {
      success: false,
      error: 'Failed to evaluate room delete policy',
      errorCode: 'delete_failed',
      warning: null,
    }
  }

  const itemCount = count ?? 0
  if (itemCount > 0 && !opts.confirmNonEmpty) {
    return {
      success: false,
      error: 'Room contains items and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasItems: true,
        itemCount,
      },
    }
  }

  const { data: deletedRooms, error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)
    .eq('household_id', householdId)
    .select('id')

  if (error) {
    return {
      success: false,
      error: 'Failed to delete room',
      errorCode: 'delete_failed',
      warning: null,
    }
  }

  if (!deletedRooms || deletedRooms.length === 0) {
    return {
      success: false,
      error: 'Room not found',
      errorCode: 'room_not_found',
      warning: null,
    }
  }

  revalidatePath('/dashboard')
  return {
    success: true,
    error: null,
    errorCode: null,
    warning: null,
  }
}
