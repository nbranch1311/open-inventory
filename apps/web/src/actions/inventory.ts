'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
export type InsertItem = Omit<Database['public']['Tables']['inventory_items']['Insert'], 'id' | 'created_at' | 'updated_at'>
export type UpdateItem = Omit<Database['public']['Tables']['inventory_items']['Update'], 'id' | 'created_at' | 'updated_at' | 'household_id'>

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

export async function getInventoryItem(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Error fetching inventory item:', error)
    return { error: 'Failed to fetch inventory item' }
  }

  return { data }
}

export async function createInventoryItem(householdId: string, item: InsertItem) {
  const supabase = await createClient()

  // Validate householdId matches item.household_id if provided in item, or just use householdId
  // The type InsertItem includes household_id, so we should ensure consistency
  if (item.household_id && item.household_id !== householdId) {
    return { error: 'Household ID mismatch' }
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

  revalidatePath(`/households/${householdId}`)
  return { data }
}

export async function updateInventoryItem(itemId: string, item: UpdateItem) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .update(item)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error updating inventory item:', error)
    return { error: 'Failed to update inventory item' }
  }

  if (data) {
    revalidatePath(`/households/${data.household_id}`)
  }
  
  return { data }
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient()

  // First get the item to know which household to revalidate
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('household_id')
    .eq('id', itemId)
    .single()

  if (fetchError) {
     console.error('Error fetching item for deletion:', fetchError)
     return { error: 'Failed to fetch item for deletion' }
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting inventory item:', error)
    return { error: 'Failed to delete inventory item' }
  }

  if (item) {
    revalidatePath(`/households/${item.household_id}`)
  }

  return { success: true }
}
