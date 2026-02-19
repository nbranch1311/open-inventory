import { redirect } from 'next/navigation'
import { getUserHouseholds } from '@/actions/household'
import { getRoomsForHousehold } from '@/actions/rooms'
import { getProductsForHousehold } from '@/actions/products'
import { AdjustStockForm } from './adjust-stock-form'

type PageProps = {
  searchParams: Promise<{ space?: string; room?: string }>
}

export default async function AdjustPage({ searchParams }: PageProps) {
  const { space, room } = await searchParams
  const households = await getUserHouseholds()
  if (!households) {
    redirect('/login')
  }
  if (households.length === 0) {
    redirect('/onboarding')
  }

  const householdId = space ?? households[0].id
  const roomsResult = await getRoomsForHousehold(householdId)
  const rooms = roomsResult.data ?? []
  const products = await getProductsForHousehold(householdId)
  const roomId = room ?? rooms[0]?.id ?? ''

  return <AdjustStockForm householdId={householdId} rooms={rooms} products={products} roomId={roomId} />
}

