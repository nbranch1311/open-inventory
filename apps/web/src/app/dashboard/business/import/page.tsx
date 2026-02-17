import { redirect } from 'next/navigation'
import { getUserHouseholds } from '@/actions/household'
import { ImportCsvForm } from './import-csv-form'

type PageProps = {
  searchParams: Promise<{ space?: string }>
}

export default async function ImportPage({ searchParams }: PageProps) {
  const { space } = await searchParams
  const households = await getUserHouseholds()
  if (households.length === 0) {
    redirect('/onboarding')
  }

  const householdId = space ?? households[0].id
  return <ImportCsvForm householdId={householdId} />
}

