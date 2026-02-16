import { redirect } from 'next/navigation'
import { getCurrentInventorySpaceSettings } from '@/actions/household'
import { InventorySpaceSettingsForm } from '@/components/settings/InventorySpaceSettingsForm'

export const dynamic = 'force-dynamic'

export default async function InventorySpaceSettingsPage() {
  const result = await getCurrentInventorySpaceSettings()

  if (result.errorCode === 'unauthenticated') {
    redirect('/login')
  }

  if (!result.data) {
    redirect('/onboarding')
  }

  return <InventorySpaceSettingsForm settings={result.data} />
}
