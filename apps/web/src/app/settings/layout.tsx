import { redirect } from 'next/navigation'
import { AccountMenu } from '@/components/navigation/AccountMenu'
import { signOut } from '@/actions/auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <AccountMenu email={user.email} signOutAction={signOut} />
      <main>{children}</main>
    </div>
  )
}
