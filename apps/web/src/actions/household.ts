'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createHousehold(name: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // 1. Create the household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name })
    .select()
    .single()

  if (householdError) {
    console.error('Error creating household:', householdError)
    throw new Error('Failed to create household')
  }

  // 2. Add the user as the owner
  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    console.error('Error adding member:', memberError)
    // Ideally we should rollback the household creation here, but Supabase doesn't support transactions via client yet (unless using RPC).
    // For MVP, we'll just throw.
    throw new Error('Failed to add user to household')
  }

  revalidatePath('/')
  return household
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
