import { redirect } from 'next/navigation'
import { getUserHouseholds } from '@/actions/household'
import { getRoomsForHousehold } from '@/actions/rooms'
import { getProductsForHousehold } from '@/actions/products'
import { ReceiveStockForm } from './receive-stock-form'

type PageProps = {
  searchParams: Promise<{ space?: string; room?: string }>
}

export default async function ReceivePage({ searchParams }: PageProps) {
  const { space, room } = await searchParams
  const households = await getUserHouseholds()
  if (households.length === 0) {
    redirect('/onboarding')
  }

  const householdId = space ?? households[0].id
  const roomsResult = await getRoomsForHousehold(householdId)
  const rooms = roomsResult.data ?? []
  const products = await getProductsForHousehold(householdId)
  const roomId = room ?? rooms[0]?.id ?? ''

  return <ReceiveStockForm householdId={householdId} rooms={rooms} products={products} roomId={roomId} />
}

