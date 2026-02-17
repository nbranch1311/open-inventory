'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import type { Room } from '@/actions/rooms'

type WorkspaceOption = {
  id: string
  name: string
}

type Props = {
  workspaces: WorkspaceOption[]
  selectedWorkspaceId: string
  rooms: Room[]
  selectedRoomId: string
}

export function WorkspaceRoomPicker({
  workspaces,
  selectedWorkspaceId,
  rooms,
  selectedRoomId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const baseParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="business-space-select" className="text-sm font-medium text-(--muted-foreground)">
          Workspace
        </label>
        <Select
          id="business-space-select"
          aria-label="Select workspace"
          value={selectedWorkspaceId}
          onChange={(event) => {
            const next = new URLSearchParams(baseParams)
            next.set('space', event.target.value)
            next.delete('room')
            router.push(`${pathname}?${next.toString()}`)
          }}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label htmlFor="business-room-select" className="text-sm font-medium text-(--muted-foreground)">
          Location (Room)
        </label>
        <Select
          id="business-room-select"
          aria-label="Select location"
          value={selectedRoomId}
          onChange={(event) => {
            const next = new URLSearchParams(baseParams)
            next.set('room', event.target.value)
            router.push(`${pathname}?${next.toString()}`)
          }}
          disabled={rooms.length === 0}
        >
          {rooms.length === 0 ? <option value="">No rooms available</option> : null}
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

