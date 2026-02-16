'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.session) {
      throw new Error('Confirm your email, then sign in to continue.')
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <AuthForm
      mode="signup"
      title="Create your account"
      description="Start organizing your Inventory Space."
      submitLabel="Sign up"
      switchHref="/login"
      switchLabel="Already have an account? Sign in"
      onSubmit={handleSignup}
    />
  )
}
