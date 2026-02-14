'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthForm
      mode="login"
      title="Sign in to your account"
      description="Use your OpenInventory credentials to continue."
      submitLabel="Sign in"
      switchHref="/signup"
      switchLabel="Create an account"
      onSubmit={handleLogin}
    />
  )
}
