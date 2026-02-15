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

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ ...item, household_id: householdId })
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
