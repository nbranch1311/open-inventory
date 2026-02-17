import { headers } from 'next/headers'
import { AccountMenu } from '@/components/navigation/AccountMenu'
import { signOut } from '@/actions/auth'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const email = headerStore.get('x-oi-user-email') ?? ''

  return (
    <div className="min-h-screen bg-background">
      <AccountMenu email={email} signOutAction={signOut} />
      <main>{children}</main>
    </div>
  )
}
