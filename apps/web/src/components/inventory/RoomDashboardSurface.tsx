'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createRoom, deleteRoom, renameRoom, type Room } from '@/actions/rooms'
import { bulkMoveInventoryItems, type InventoryItem } from '@/actions/inventory'
import { createHousehold, deleteInventorySpace, renameInventorySpace } from '@/actions/household'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'

type HouseholdSummary = {
  id: string
  name: string
  role: string | null
}

type MoveRoomGroup = {
  spaceId: string
  spaceName: string
  rooms: Array<Pick<Room, 'id' | 'name'>>
}

type RoomDashboardSurfaceProps = {
  households: HouseholdSummary[]
  selectedHouseholdId: string
  selectedRoomId: string | null
  rooms: Room[]
  items: InventoryItem[]
  roomSearch: string
  roomSort: 'recent' | 'name' | 'expiration'
  destinationRooms: MoveRoomGroup[]
}

const SEARCH_DEBOUNCE_MS = 300
const MAX_SPACES = 5
const SPACE_LIMIT_MESSAGE = 'You can have up to 5 Inventory Spaces.'

const FAILURE_REASON_LABEL: Record<string, string> = {
  item_not_found_or_forbidden: 'item not found or inaccessible',
  forbidden_source_household: 'source inventory space access denied',
  update_failed: 'update failed',
}

function buildDashboardUrl(params: URLSearchParams) {
  const serialized = params.toString()
  return serialized.length > 0 ? `/dashboard?${serialized}` : '/dashboard'
}

export function RoomDashboardSurface({
  households,
  selectedHouseholdId,
  selectedRoomId,
  rooms,
  items,
  roomSearch,
  roomSort,
  destinationRooms,
}: RoomDashboardSurfaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(roomSearch)
  const [newRoomName, setNewRoomName] = useState('')
  const [roomCreateModeOpen, setRoomCreateModeOpen] = useState(false)
  const [roomCreatePending, setRoomCreatePending] = useState(false)
  const [roomCreateError, setRoomCreateError] = useState<string | null>(null)
  const [roomRenameId, setRoomRenameId] = useState<string | null>(null)
  const [roomRenameValue, setRoomRenameValue] = useState('')
  const [roomRenamePending, setRoomRenamePending] = useState(false)
  const [roomRenameError, setRoomRenameError] = useState<string | null>(null)
  const [roomDeletePending, setRoomDeletePending] = useState(false)
  const [roomDeleteError, setRoomDeleteError] = useState<string | null>(null)
  const [roomDeleteWarning, setRoomDeleteWarning] = useState<{
    roomId: string
    roomName: string
    itemCount: number
  } | null>(null)

  const [spaceEditMode, setSpaceEditMode] = useState(false)
  const [spaceCreatePending, setSpaceCreatePending] = useState(false)
  const [spaceCreateError, setSpaceCreateError] = useState<string | null>(null)
  const [spaceRenameValue, setSpaceRenameValue] = useState('')
  const [spaceRenamePending, setSpaceRenamePending] = useState(false)
  const [spaceRenameError, setSpaceRenameError] = useState<string | null>(null)
  const [spaceRenameSuccess, setSpaceRenameSuccess] = useState<string | null>(null)
  const [spaceDeletePending, setSpaceDeletePending] = useState(false)
  const [spaceDeleteError, setSpaceDeleteError] = useState<string | null>(null)
  const [spaceDeleteWarning, setSpaceDeleteWarning] = useState<{
    roomCount: number
  } | null>(null)

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [moveDestinationSpaceId, setMoveDestinationSpaceId] = useState('')
  const [moveDestinationRoomId, setMoveDestinationRoomId] = useState('')
  const [bulkMovePending, setBulkMovePending] = useState(false)
  const [bulkMoveError, setBulkMoveError] = useState<string | null>(null)
  const [bulkMoveSuccess, setBulkMoveSuccess] = useState<string | null>(null)

  const selectedSpace = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId],
  )
  const canManageSelectedSpace = selectedSpace?.role === 'owner' || selectedSpace?.role === 'admin'
  const canCreateMoreSpaces = households.length < MAX_SPACES
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )

  useEffect(() => {
    setSearchInput(roomSearch)
  }, [roomSearch])

  useEffect(() => {
    setSpaceCreateError(null)
    setSpaceRenameValue(selectedSpace?.name ?? '')
    setSpaceRenameError(null)
    setSpaceRenameSuccess(null)
    setSpaceDeleteError(null)
    setSpaceDeleteWarning(null)
    setSpaceEditMode(false)
  }, [selectedSpace?.id, selectedSpace?.name])

  useEffect(() => {
    setSelectedItemIds([])
    setBulkMoveError(null)
    setBulkMoveSuccess(null)
    setMoveDestinationSpaceId('')
    setMoveDestinationRoomId('')
    setRoomDeleteWarning(null)
    setRoomDeleteError(null)
    setRoomRenameId(null)
    setRoomRenameValue('')
    setRoomRenameError(null)
  }, [selectedRoomId])

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const nextParams = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          nextParams.delete(key)
        } else {
          nextParams.set(key, value)
        }
      })
      router.push(buildDashboardUrl(nextParams))
    },
    [router, searchParams],
  )

  useEffect(() => {
    if (searchInput === roomSearch) {
      return
    }
    const timer = setTimeout(() => {
      updateParams({ q: searchInput || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput, roomSearch, updateParams])

  const hasRooms = rooms.length > 0

  const availableDestinationGroups = useMemo(() => {
    return destinationRooms
      .map((group) => ({
        ...group,
        rooms: group.rooms.filter((room) => room.id !== selectedRoomId),
      }))
      .filter((group) => group.rooms.length > 0)
  }, [destinationRooms, selectedRoomId])

  const selectedDestinationGroup = useMemo(() => {
    if (availableDestinationGroups.length === 0) {
      return null
    }

    return (
      availableDestinationGroups.find((group) => group.spaceId === moveDestinationSpaceId) ??
      availableDestinationGroups[0]
    )
  }, [availableDestinationGroups, moveDestinationSpaceId])

  const availableDestinationRooms = selectedDestinationGroup?.rooms ?? []

  useEffect(() => {
    if (!selectedDestinationGroup) {
      if (moveDestinationSpaceId !== '') {
        setMoveDestinationSpaceId('')
      }
      if (moveDestinationRoomId !== '') {
        setMoveDestinationRoomId('')
      }
      return
    }

    if (selectedDestinationGroup.spaceId !== moveDestinationSpaceId) {
      setMoveDestinationSpaceId(selectedDestinationGroup.spaceId)
    }
  }, [selectedDestinationGroup, moveDestinationSpaceId, moveDestinationRoomId])

  useEffect(() => {
    if (availableDestinationRooms.length === 0) {
      if (moveDestinationRoomId !== '') {
        setMoveDestinationRoomId('')
      }
      return
    }

    const roomStillAvailable = availableDestinationRooms.some(
      (room) => room.id === moveDestinationRoomId,
    )
    if (!roomStillAvailable) {
      setMoveDestinationRoomId(availableDestinationRooms[0].id)
    }
  }, [availableDestinationRooms, moveDestinationRoomId])

  const itemNameById = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((item) => {
      map.set(item.id, item.name)
    })
    return map
  }, [items])

  const selectedCount = selectedItemIds.length

  const buildNextSpaceName = () => {
    const baseName = 'Inventory Space'
    let suffix = households.length + 1
    const existingNames = new Set(
      households.map((household) => household.name.trim().toLowerCase()),
    )
    let candidate = `${baseName} ${suffix}`
    while (existingNames.has(candidate.trim().toLowerCase())) {
      suffix += 1
      candidate = `${baseName} ${suffix}`
    }
    return candidate
  }

  const handleSpaceSelect = (spaceId: string) => {
    updateParams({
      space: spaceId,
      room: undefined,
      q: undefined,
      sort: undefined,
    })
  }

  const handleRoomSelect = (roomId: string) => {
    updateParams({
      room: roomId || undefined,
      q: undefined,
      sort: roomSort === 'recent' ? undefined : roomSort,
    })
  }

  const handleSortChange = (sortValue: string) => {
    updateParams({
      sort: sortValue === 'recent' ? undefined : sortValue,
    })
  }

  const handleCreateSpace = async () => {
    if (!canCreateMoreSpaces) {
      setSpaceCreateError(SPACE_LIMIT_MESSAGE)
      return
    }

    setSpaceCreatePending(true)
    setSpaceCreateError(null)
    try {
      const result = await createHousehold(buildNextSpaceName())
      if (result.error || !result.data) {
        if (result.errorCode === 'household_limit_reached') {
          setSpaceCreateError(SPACE_LIMIT_MESSAGE)
        } else {
          setSpaceCreateError(result.error ?? 'Failed to create inventory space.')
        }
        return
      }

      updateParams({
        space: result.data.id,
        room: undefined,
        q: undefined,
        sort: undefined,
      })
      router.refresh()
    } catch {
      setSpaceCreateError('Failed to create inventory space.')
    } finally {
      setSpaceCreatePending(false)
    }
  }

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newRoomName.trim()) {
      setRoomCreateError('Room name is required.')
      return
    }
    setRoomCreatePending(true)
    setRoomCreateError(null)
    try {
      const result = await createRoom(selectedHouseholdId, newRoomName)
      if (result.error) {
        setRoomCreateError(result.error)
        return
      }

      setNewRoomName('')
      setRoomCreateModeOpen(false)
      const nextRoomId = result.data?.id
      if (nextRoomId) {
        updateParams({ room: nextRoomId })
      }
      router.refresh()
    } catch {
      setRoomCreateError('Failed to create room.')
    } finally {
      setRoomCreatePending(false)
    }
  }

  const handleStartRenameRoom = (room: Room) => {
    setRoomRenameId(room.id)
    setRoomRenameValue(room.name)
    setRoomRenameError(null)
  }

  const handleRenameRoom = async (roomId: string) => {
    if (!roomRenameValue.trim()) {
      setRoomRenameError('Room name is required.')
      return
    }
    setRoomRenamePending(true)
    setRoomRenameError(null)
    try {
      const result = await renameRoom(selectedHouseholdId, roomId, roomRenameValue)
      if (result.error) {
        setRoomRenameError(result.error)
        return
      }
      setRoomRenameId(null)
      setRoomRenameValue('')
      router.refresh()
    } catch {
      setRoomRenameError('Failed to rename room.')
    } finally {
      setRoomRenamePending(false)
    }
  }

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    setRoomDeletePending(true)
    setRoomDeleteError(null)
    setRoomDeleteWarning(null)
    try {
      const result = await deleteRoom(selectedHouseholdId, roomId)
      if (!result.success) {
        if (result.errorCode === 'warning_required' && result.warning?.hasItems) {
          setRoomDeleteWarning({
            roomId,
            roomName,
            itemCount: result.warning.itemCount,
          })
          return
        }
        setRoomDeleteError(result.error ?? 'Failed to delete room.')
        return
      }

      const nextRoomId = rooms.find((room) => room.id !== roomId)?.id
      updateParams({ room: nextRoomId })
      router.refresh()
    } catch {
      setRoomDeleteError('Failed to delete room.')
    } finally {
      setRoomDeletePending(false)
    }
  }

  const handleConfirmDeleteRoom = async () => {
    if (!roomDeleteWarning) {
      return
    }
    setRoomDeletePending(true)
    setRoomDeleteError(null)
    try {
      const result = await deleteRoom(selectedHouseholdId, roomDeleteWarning.roomId, {
        confirmNonEmpty: true,
      })
      if (!result.success) {
        setRoomDeleteError(result.error ?? 'Failed to delete room.')
        return
      }

      const nextRoomId = rooms.find((room) => room.id !== roomDeleteWarning.roomId)?.id
      setRoomDeleteWarning(null)
      updateParams({ room: nextRoomId })
      router.refresh()
    } catch {
      setRoomDeleteError('Failed to delete room.')
    } finally {
      setRoomDeletePending(false)
    }
  }

  const handleRenameSpace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!spaceRenameValue.trim()) {
      setSpaceRenameError('Inventory Space name is required.')
      return
    }
    setSpaceRenamePending(true)
    setSpaceRenameError(null)
    setSpaceRenameSuccess(null)
    try {
      const result = await renameInventorySpace(selectedHouseholdId, spaceRenameValue)
      if (result.error) {
        setSpaceRenameError(result.error)
        return
      }
      setSpaceRenameSuccess('Inventory Space renamed.')
      router.refresh()
    } catch {
      setSpaceRenameError('Failed to rename inventory space.')
    } finally {
      setSpaceRenamePending(false)
    }
  }

  const handleDeleteSpace = async () => {
    setSpaceDeletePending(true)
    setSpaceDeleteError(null)
    setSpaceDeleteWarning(null)
    try {
      const result = await deleteInventorySpace(selectedHouseholdId)
      if (!result.success) {
        if (result.errorCode === 'warning_required' && result.warning?.hasRooms) {
          setSpaceDeleteWarning({ roomCount: result.warning.roomCount })
          return
        }
        setSpaceDeleteError(result.error ?? 'Failed to delete inventory space.')
        return
      }

      const nextSpaceId = households.find((household) => household.id !== selectedHouseholdId)?.id
      router.push(nextSpaceId ? `/dashboard?space=${nextSpaceId}` : '/onboarding')
      router.refresh()
    } catch {
      setSpaceDeleteError('Failed to delete inventory space.')
    } finally {
      setSpaceDeletePending(false)
    }
  }

  const handleConfirmDeleteSpace = async () => {
    setSpaceDeletePending(true)
    setSpaceDeleteError(null)
    try {
      const result = await deleteInventorySpace(selectedHouseholdId, { confirmHasRooms: true })
      if (!result.success) {
        setSpaceDeleteError(result.error ?? 'Failed to delete inventory space.')
        return
      }

      const nextSpaceId = households.find((household) => household.id !== selectedHouseholdId)?.id
      router.push(nextSpaceId ? `/dashboard?space=${nextSpaceId}` : '/onboarding')
      router.refresh()
    } catch {
      setSpaceDeleteError('Failed to delete inventory space.')
    } finally {
      setSpaceDeletePending(false)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((previous) =>
      previous.includes(itemId) ? previous.filter((id) => id !== itemId) : [...previous, itemId],
    )
  }

  const handleBulkMove = async () => {
    if (selectedItemIds.length === 0) {
      setBulkMoveError('Select at least one item.')
      return
    }
    if (!moveDestinationRoomId) {
      setBulkMoveError('Choose a destination room.')
      return
    }

    setBulkMovePending(true)
    setBulkMoveError(null)
    setBulkMoveSuccess(null)
    try {
      const result = await bulkMoveInventoryItems(selectedItemIds, moveDestinationRoomId)
      if (!result.success) {
        const failureDetails = result.failures
          .map((failure) => {
            const itemName = itemNameById.get(failure.itemId) ?? failure.itemId
            const reasonLabel = FAILURE_REASON_LABEL[failure.reason] ?? failure.reason
            return `${itemName}: ${reasonLabel}`
          })
          .join(' | ')
        setBulkMoveError(
          failureDetails.length > 0
            ? `Move failed for ${result.failures.length} item(s): ${failureDetails}`
            : (result.error ?? 'Failed to move selected items.'),
        )
        return
      }

      setBulkMoveSuccess(`Moved ${result.movedItemIds.length} item(s) successfully.`)
      setSelectedItemIds([])
      router.refresh()
    } catch {
      setBulkMoveError('Failed to move selected items.')
    } finally {
      setBulkMovePending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-(--border) bg-(--card) p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="inventory-space-select" className="text-sm font-medium text-(--muted-foreground)">
                Inventory Space
              </label>
              <Select
                id="inventory-space-select"
                aria-label="Select inventory space"
                value={selectedHouseholdId}
                onChange={(event) => handleSpaceSelect(event.target.value)}
              >
                {households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="room-select" className="text-sm font-medium text-(--muted-foreground)">
                Room
              </label>
              <Select
                id="room-select"
                aria-label="Select room"
                value={selectedRoom?.id ?? ''}
                onChange={(event) => handleRoomSelect(event.target.value)}
                disabled={!hasRooms}
              >
                {!hasRooms ? <option value="">No rooms available</option> : null}
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateSpace}
              disabled={spaceCreatePending || !canCreateMoreSpaces}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {spaceCreatePending ? 'Creating...' : 'New Space'}
            </Button>

            {canManageSelectedSpace ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoomCreateModeOpen((open) => !open)}
                disabled={roomCreatePending}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Room
              </Button>
            ) : null}

            {canManageSelectedSpace ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={spaceEditMode ? 'secondary' : 'outline'}
                    onClick={() => setSpaceEditMode((open) => !open)}
                    aria-label="Edit selected space"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit selected space</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>

        {spaceCreateError ? <Alert variant="destructive">{spaceCreateError}</Alert> : null}
        {!canCreateMoreSpaces ? <Alert>{SPACE_LIMIT_MESSAGE}</Alert> : null}

        {roomCreateModeOpen && canManageSelectedSpace ? (
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleCreateRoom}>
            <Input
              aria-label="New room name"
              placeholder="New room name"
              value={newRoomName}
              onChange={(event) => setNewRoomName(event.target.value)}
              disabled={roomCreatePending}
            />
            <Button type="submit" disabled={roomCreatePending}>
              {roomCreatePending ? 'Creating...' : 'Create room'}
            </Button>
          </form>
        ) : null}
        {roomCreateError ? <Alert variant="destructive">{roomCreateError}</Alert> : null}

        {spaceEditMode ? (
          <div className="space-y-3 rounded-md border border-(--border) bg-background p-3">
            <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleRenameSpace}>
              <Input
                aria-label="Rename selected inventory space"
                value={spaceRenameValue}
                onChange={(event) => setSpaceRenameValue(event.target.value)}
                disabled={spaceRenamePending}
              />
              <Button type="submit" disabled={spaceRenamePending}>
                {spaceRenamePending ? 'Renaming...' : 'Rename space'}
              </Button>
            </form>
            {spaceRenameError ? <Alert variant="destructive">{spaceRenameError}</Alert> : null}
            {spaceRenameSuccess ? <Alert>{spaceRenameSuccess}</Alert> : null}

            <div className="space-y-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteSpace}
                disabled={spaceDeletePending}
              >
                {spaceDeletePending ? 'Deleting...' : 'Delete selected space'}
              </Button>
              {spaceDeleteWarning ? (
                <Alert variant="destructive">
                  This space has {spaceDeleteWarning.roomCount} room(s). Confirm deletion to continue.
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="destructive" onClick={handleConfirmDeleteSpace}>
                      Confirm delete
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSpaceDeleteWarning(null)}>
                      Cancel space delete
                    </Button>
                  </div>
                </Alert>
              ) : null}
              {spaceDeleteError ? <Alert variant="destructive">{spaceDeleteError}</Alert> : null}
            </div>
          </div>
        ) : null}
      </section>

      {roomDeleteWarning ? (
        <Alert variant="destructive">
          Room "{roomDeleteWarning.roomName}" has {roomDeleteWarning.itemCount} item(s). Confirm deletion to continue.
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="destructive" onClick={handleConfirmDeleteRoom}>
              Confirm delete room
            </Button>
            <Button type="button" variant="outline" onClick={() => setRoomDeleteWarning(null)}>
              Cancel room delete
            </Button>
          </div>
        </Alert>
      ) : null}
      {roomDeleteError ? <Alert variant="destructive">{roomDeleteError}</Alert> : null}

      {selectedRoom ? (
        <section className="space-y-4 rounded-lg border border-(--border) bg-(--card) p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selectedRoom.name}</h2>
              <p className="text-sm text-(--muted-foreground)">Search, sort, add, and move items in this room.</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedRoom && roomRenameId !== selectedRoom.id ? (
                <Button asChild>
                  <Link
                    href={`/dashboard/add?space=${selectedHouseholdId}&room=${selectedRoom.id}`}
                    prefetch={false}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Item
                  </Link>
                </Button>
              ) : null}
              {canManageSelectedSpace && roomRenameId !== selectedRoom.id ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleStartRenameRoom(selectedRoom)}
                      aria-label="Edit Room"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Room</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>

          {roomRenameId === selectedRoom.id ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label={`Rename room ${selectedRoom.name}`}
                value={roomRenameValue}
                onChange={(event) => setRoomRenameValue(event.target.value)}
                disabled={roomRenamePending}
              />
              <Button type="button" onClick={() => handleRenameRoom(selectedRoom.id)} disabled={roomRenamePending}>
                {roomRenamePending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRoomRenameId(null)
                  setRoomRenameValue('')
                  setRoomRenameError(null)
                }}
              >
                Cancel
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => void handleDeleteRoom(selectedRoom.id, selectedRoom.name)}
                    disabled={roomDeletePending}
                    aria-label="Delete Room"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Room</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
          {roomRenameError ? <Alert variant="destructive">{roomRenameError}</Alert> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              type="search"
              aria-label="Search room items"
              placeholder={`Search ${selectedRoom.name} items`}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Select
              value={roomSort}
              onChange={(event) => handleSortChange(event.target.value)}
              aria-label="Sort room items"
            >
              <option value="recent">Most recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="expiration">Expiration (soonest)</option>
            </Select>
          </div>

          {selectedCount > 0 ? (
            <div className="space-y-2 rounded-md border border-(--border) bg-background p-3">
              <p className="text-sm font-medium">{selectedCount} item(s) selected for bulk move</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Select
                  aria-label="Move destination space"
                  value={moveDestinationSpaceId}
                  onChange={(event) => setMoveDestinationSpaceId(event.target.value)}
                >
                  <option value="">Choose destination space</option>
                  {availableDestinationGroups.map((group) => (
                    <option key={group.spaceId} value={group.spaceId}>
                      {group.spaceName}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Move destination room"
                  value={moveDestinationRoomId}
                  onChange={(event) => setMoveDestinationRoomId(event.target.value)}
                  disabled={availableDestinationRooms.length === 0}
                >
                  {availableDestinationRooms.length === 0 ? (
                    <option value="">Choose destination room</option>
                  ) : null}
                  {availableDestinationRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
                <Button type="button" onClick={handleBulkMove} disabled={bulkMovePending}>
                  {bulkMovePending ? 'Moving...' : 'Move selected items'}
                </Button>
              </div>
              {bulkMoveError ? <Alert variant="destructive">{bulkMoveError}</Alert> : null}
              {bulkMoveSuccess ? <Alert>{bulkMoveSuccess}</Alert> : null}
            </div>
          ) : null}

          {items.length === 0 ? (
            <Alert>No items found for this room.</Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-md border border-(--border) bg-background p-3">
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                    Select
                  </label>
                  <Link
                    href={`/dashboard/${item.id}?household=${item.household_id}`}
                    prefetch={false}
                    className="block space-y-1"
                  >
                    <p className="flex items-start justify-between gap-3 text-foreground">
                      <span className="font-medium">{item.name}</span>
                      <span className="shrink-0 text-sm text-(--muted-foreground)">
                        {item.quantity} {item.unit}
                      </span>
                    </p>
                    {item.expiry_date ? (
                      <p className="text-xs text-(--muted-foreground)">
                        Expires {new Date(item.expiry_date).toLocaleDateString()}
                      </p>
                    ) : null}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <Alert>Select or create a room to start managing inventory items.</Alert>
      )}
    </div>
  )
}
