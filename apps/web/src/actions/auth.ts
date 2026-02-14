'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('[auth.signOut] failed to clear session', {
      code: error.code,
      message: error.message,
    })
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
