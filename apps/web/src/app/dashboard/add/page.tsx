import { getUserHouseholds } from '@/actions/household'
import { createInventoryItem } from '@/actions/inventory'
import { getRoomsForHousehold } from '@/actions/rooms'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AddItemForm } from './add-item-form'

type AddItemFormState = {
  error: string | null
}

type AddItemPageProps = {
  searchParams: Promise<{ space?: string; room?: string }>
}

export default async function AddItemPage({ searchParams }: AddItemPageProps) {
  const households = await getUserHouseholds()

  if (!households || households.length === 0) {
    redirect('/onboarding')
  }

  const { space: selectedSpaceFromUrl, room: selectedRoomFromUrl } = await searchParams
  const selectedHousehold =
    households.find((household) => household.id === selectedSpaceFromUrl) ?? households[0]

  if (!selectedHousehold) {
    redirect('/onboarding')
  }

  const roomsResult = await getRoomsForHousehold(selectedHousehold.id)
  const rooms = roomsResult.data ?? []
  const defaultRoom =
    rooms.find((room) => room.id === selectedRoomFromUrl) ?? rooms[0] ?? null

  if (rooms.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-2xl font-bold">Add New Item</h1>
        <Alert className="mb-4">
          Create a room in your selected Inventory Space before adding items.
        </Alert>
        <Button asChild>
          <Link href={`/dashboard?space=${selectedHousehold.id}`}>Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  async function addItem(_: AddItemFormState, formData: FormData): Promise<AddItemFormState> {
    'use server'

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    const quantity = Number(formData.get('quantity'))
    const unit = (formData.get('unit') as string | null)?.trim() ?? ''
    const roomId = (formData.get('roomId') as string | null)?.trim() ?? ''
    const description = formData.get('description') as string
    const expiryDate = formData.get('expiryDate') as string

    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit || !roomId) {
      return { error: 'Name, quantity, unit, and room are required.' }
    }

    if (!rooms.some((room) => room.id === roomId)) {
      return { error: 'Selected room is invalid for this inventory space.' }
    }

    const { error } = await createInventoryItem(selectedHousehold.id, {
      name,
      quantity,
      unit,
      description,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      household_id: selectedHousehold.id,
      room_id: roomId,
    })

    if (error) {
      return { error }
    }

    redirect(`/dashboard?space=${selectedHousehold.id}&room=${roomId}`)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold">Add New Item</h1>
      <AddItemForm
        action={addItem}
        rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
        defaultRoomId={defaultRoom?.id}
      />
    </div>
  )
}
