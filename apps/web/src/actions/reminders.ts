'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type ItemReminder = Database['public']['Tables']['item_reminders']['Row']

export type CreateReminderInput = {
  reminder_date: string
  message?: string | null
}

export type UpdateReminderInput = {
  reminder_date?: string
  message?: string | null
}

async function assertItemOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  itemId: string,
) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .single()

  if (error || !data) {
    return { error: 'Item not found for household' as const }
  }

  return { success: true as const }
}

export async function getItemReminders(
  householdId: string,
  itemId: string,
): Promise<{ data?: ItemReminder[]; error?: string }> {
  const supabase = await createClient()

  const ownership = await assertItemOwnership(supabase, householdId, itemId)
  if ('error' in ownership) {
    return { error: ownership.error }
  }

  const { data, error } = await supabase
    .from('item_reminders')
    .select('*')
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .order('reminder_date', { ascending: true })

  if (error) {
    console.error('Error fetching item reminders:', error)
    return { error: 'Failed to fetch reminders' }
  }

  return { data: data ?? [] }
}

export async function createReminder(
  householdId: string,
  itemId: string,
  input: CreateReminderInput,
): Promise<{ data?: ItemReminder; error?: string }> {
  const supabase = await createClient()

  const ownership = await assertItemOwnership(supabase, householdId, itemId)
  if ('error' in ownership) {
    return { error: ownership.error }
  }

  const reminderDate = input.reminder_date?.trim()
  if (!reminderDate) {
    return { error: 'Reminder date is required' }
  }

  const parsed = new Date(reminderDate)
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'Invalid reminder date' }
  }

  const { data, error } = await supabase
    .from('item_reminders')
    .insert({
      household_id: householdId,
      item_id: itemId,
      reminder_date: reminderDate,
      message: input.message?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reminder:', error)
    return { error: 'Failed to create reminder' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${itemId}`)
  return { data }
}

export async function updateReminder(
  householdId: string,
  reminderId: string,
  input: UpdateReminderInput,
): Promise<{ data?: ItemReminder; error?: string }> {
  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {}
  if (input.reminder_date !== undefined) {
    const reminderDate = input.reminder_date?.trim()
    if (!reminderDate) {
      return { error: 'Reminder date is required' }
    }
    const parsed = new Date(reminderDate)
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Invalid reminder date' }
    }
    updatePayload.reminder_date = reminderDate
  }
  if (input.message !== undefined) {
    updatePayload.message = input.message?.trim() || null
  }

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data, error } = await supabase
    .from('item_reminders')
    .update(updatePayload)
    .eq('id', reminderId)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) {
    console.error('Error updating reminder:', error)
    return { error: 'Failed to update reminder' }
  }

  if (data) {
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/${data.item_id}`)
  }

  return { data }
}

export async function completeReminder(
  householdId: string,
  reminderId: string,
): Promise<{ data?: ItemReminder; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('item_reminders')
    .update({ is_completed: true, snoozed_until: null })
    .eq('id', reminderId)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) {
    console.error('Error completing reminder:', error)
    return { error: 'Failed to complete reminder' }
  }

  if (data) {
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/${data.item_id}`)
  }

  return { data }
}

export async function deleteReminder(
  householdId: string,
  reminderId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: reminder, error: fetchError } = await supabase
    .from('item_reminders')
    .select('item_id')
    .eq('id', reminderId)
    .eq('household_id', householdId)
    .single()

  if (fetchError || !reminder) {
    return { error: 'Reminder not found' }
  }

  const { error } = await supabase
    .from('item_reminders')
    .delete()
    .eq('id', reminderId)
    .eq('household_id', householdId)

  if (error) {
    console.error('Error deleting reminder:', error)
    return { error: 'Failed to delete reminder' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${reminder.item_id}`)
  return { success: true }
}

export async function snoozeReminder(
  householdId: string,
  reminderId: string,
  snoozedUntil: string,
): Promise<{ data?: ItemReminder; error?: string }> {
  const supabase = await createClient()

  const parsed = new Date(snoozedUntil)
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'Invalid snooze date' }
  }

  const { data, error } = await supabase
    .from('item_reminders')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', reminderId)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) {
    console.error('Error snoozing reminder:', error)
    return { error: 'Failed to snooze reminder' }
  }

  if (data) {
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/${data.item_id}`)
  }

  return { data }
}

export type UpcomingReminderWithItem = ItemReminder & {
  inventory_items: { id: string; name: string } | null
}

export async function getUpcomingReminders(
  householdId: string,
  limit = 10,
): Promise<{ data?: UpcomingReminderWithItem[]; error?: string }> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('item_reminders')
    .select(`
      *,
      inventory_items (id, name)
    `)
    .eq('household_id', householdId)
    .eq('is_completed', false)
    .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
    .order('reminder_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching upcoming reminders:', error)
    return { error: 'Failed to fetch upcoming reminders' }
  }

  return { data: (data ?? []) as UpcomingReminderWithItem[] }
}
