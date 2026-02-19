import { getUserHouseholds } from '@/actions/household'
import {
  type InventorySortBy,
  searchInventoryItems,
} from '@/actions/inventory'
import { getRoomsForHouseholds } from '@/actions/rooms'
import { getUpcomingReminders } from '@/actions/reminders'
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel'
import { RoomDashboardSurface } from '@/components/inventory/RoomDashboardSurface'
import { UpcomingRemindersSection } from '@/components/reminders/UpcomingRemindersSection'
import { redirect } from 'next/navigation'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const households = await getUserHouseholds()

  if (!households) {
    redirect('/login')
  }

  if (households.length === 0) {
    redirect('/onboarding')
  }

  const params = await searchParams
  const selectedSpaceIdFromUrl = typeof params?.space === 'string' ? params.space : null
  const selectedHousehold =
    households.find((household) => household.id === selectedSpaceIdFromUrl) ?? households[0]
  if (!selectedHousehold) {
    redirect('/onboarding')
  }

  const q = typeof params?.q === 'string' ? params.q : undefined
  const sortBy: InventorySortBy =
    typeof params?.sort === 'string' &&
    (params.sort === 'recent' || params.sort === 'name' || params.sort === 'expiration')
      ? params.sort
      : 'recent'
  const selectedRoomIdFromUrl = typeof params?.room === 'string' ? params.room : null

  const householdIds = households.map((household) => household.id)

  const [allRoomsResult, remindersRes] = await Promise.all([
    getRoomsForHouseholds(householdIds),
    getUpcomingReminders(selectedHousehold.id, 10),
  ])

  const selectedSpaceRooms = allRoomsResult.data?.[selectedHousehold.id] ?? []
  const selectedRoom =
    selectedSpaceRooms.find((room) => room.id === selectedRoomIdFromUrl) ?? selectedSpaceRooms[0] ?? null

  const { data: roomItems, error } = await searchInventoryItems(selectedHousehold.id, {
    keyword: q,
    roomId: selectedRoom?.id ?? undefined,
    sortBy,
    sortOrder:
      sortBy === 'name'
        ? 'asc'
        : sortBy === 'expiration'
          ? 'asc'
          : 'desc',
  })

  const allRoomsBySpace = households.map((household) => {
    const roomsForSpace = allRoomsResult.data?.[household.id] ?? []
    return {
      spaceId: household.id,
      spaceName: household.name,
      rooms: roomsForSpace.map((room) => ({ id: room.id, name: room.name })),
    }
  })

  const selectedRoomItems = roomItems ?? []

  const upcomingReminders = remindersRes.error ? [] : (remindersRes.data ?? [])
  const remindersError = remindersRes.error

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        Error loading inventory: {error}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{selectedHousehold.name} Inventory</h1>
        <AIAssistantPanel householdId={selectedHousehold.id} />
      </div>

      <div className="mb-6">
        {remindersError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Could not load reminders. {remindersError}
            </p>
          </div>
        ) : (
          <UpcomingRemindersSection
            reminders={upcomingReminders}
            householdId={selectedHousehold.id}
          />
        )}
      </div>

      <RoomDashboardSurface
        households={households.map((household) => ({
          id: household.id,
          name: household.name,
          role: household.role ?? null,
        }))}
        selectedHouseholdId={selectedHousehold.id}
        selectedRoomId={selectedRoom?.id ?? null}
        rooms={selectedSpaceRooms}
        items={selectedRoomItems}
        roomSearch={q ?? ''}
        roomSort={sortBy}
        destinationRooms={allRoomsBySpace}
      />
    </div>
  )
}
