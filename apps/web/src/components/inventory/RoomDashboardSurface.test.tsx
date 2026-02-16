import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomDashboardSurface } from './RoomDashboardSurface'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
let mockSearchParams = ''

const mockCreateRoom = vi.fn()
const mockRenameRoom = vi.fn()
const mockDeleteRoom = vi.fn()
const mockBulkMoveInventoryItems = vi.fn()
const mockCreateHousehold = vi.fn()
const mockRenameInventorySpace = vi.fn()
const mockDeleteInventorySpace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}))

vi.mock('@/actions/rooms', () => ({
  createRoom: (...args: unknown[]) => mockCreateRoom(...args),
  renameRoom: (...args: unknown[]) => mockRenameRoom(...args),
  deleteRoom: (...args: unknown[]) => mockDeleteRoom(...args),
}))

vi.mock('@/actions/inventory', () => ({
  bulkMoveInventoryItems: (...args: unknown[]) => mockBulkMoveInventoryItems(...args),
}))

vi.mock('@/actions/household', () => ({
  createHousehold: (...args: unknown[]) => mockCreateHousehold(...args),
  renameInventorySpace: (...args: unknown[]) => mockRenameInventorySpace(...args),
  deleteInventorySpace: (...args: unknown[]) => mockDeleteInventorySpace(...args),
}))

const baseProps = {
  households: [
    { id: 'space-1', name: 'Home', role: 'owner' },
    { id: 'space-2', name: 'Cabin', role: 'owner' },
  ],
  selectedHouseholdId: 'space-1',
  selectedRoomId: 'room-1',
  rooms: [
    {
      id: 'room-1',
      household_id: 'space-1',
      name: 'Kitchen',
      created_at: '2026-02-16T00:00:00.000Z',
      updated_at: '2026-02-16T00:00:00.000Z',
    },
    {
      id: 'room-2',
      household_id: 'space-1',
      name: 'Pantry',
      created_at: '2026-02-16T00:00:00.000Z',
      updated_at: '2026-02-16T00:00:00.000Z',
    },
  ],
  items: [
    {
      id: 'item-1',
      household_id: 'space-1',
      room_id: 'room-1',
      name: 'Milk',
      quantity: 1,
      unit: 'carton',
      description: null,
      category_id: null,
      location_id: null,
      status: 'active',
      expiry_date: null,
      purchase_date: null,
      created_at: '2026-02-16T00:00:00.000Z',
      updated_at: '2026-02-16T00:00:00.000Z',
    },
  ],
  roomSearch: '',
  roomSort: 'recent' as const,
  destinationRooms: [
    {
      spaceId: 'space-1',
      spaceName: 'Home',
      rooms: [
        { id: 'room-1', name: 'Kitchen' },
        { id: 'room-2', name: 'Pantry' },
      ],
    },
    {
      spaceId: 'space-2',
      spaceName: 'Cabin',
      rooms: [{ id: 'room-3', name: 'Storage' }],
    },
  ],
}

describe('RoomDashboardSurface', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSearchParams = ''
    mockCreateRoom.mockReset()
    mockRenameRoom.mockReset()
    mockDeleteRoom.mockReset()
    mockBulkMoveInventoryItems.mockReset()
    mockCreateHousehold.mockReset()
    mockRenameInventorySpace.mockReset()
    mockDeleteInventorySpace.mockReset()
  })

  it('renders coordinated space and room controls with right-aligned actions', () => {
    render(<RoomDashboardSurface {...baseProps} />)

    expect(screen.getByRole('combobox', { name: 'Select inventory space' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Select room' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Space' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Room' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Item' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit selected space' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Room' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kitchen' })).not.toBeInTheDocument()
  })

  it('shows warning flow for deleting non-empty room', async () => {
    mockDeleteRoom.mockResolvedValue({
      success: false,
      error: 'Room contains items and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasItems: true,
        itemCount: 2,
      },
    })

    render(<RoomDashboardSurface {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Room' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Room' }))

    await waitFor(() => {
      expect(
        screen.getByText('Room "Kitchen" has 2 item(s). Confirm deletion to continue.'),
      ).toBeInTheDocument()
    })
  })

  it('shows deterministic per-item failures for bulk move', async () => {
    mockBulkMoveInventoryItems.mockResolvedValue({
      success: false,
      movedItemIds: [],
      failures: [{ itemId: 'item-1', reason: 'item_not_found_or_forbidden' }],
      error: 'One or more items failed validation',
      errorCode: 'validation_failed',
    })

    render(<RoomDashboardSurface {...baseProps} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Milk' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Move destination space' }), {
      target: { value: 'space-2' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Move destination room' }), {
      target: { value: 'room-3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Move selected items' }))

    await waitFor(() => {
      expect(
        screen.getByText('Move failed for 1 item(s): Milk: item not found or inaccessible'),
      ).toBeInTheDocument()
    })
  })

  it('shows deterministic max-5 guidance for new space control', () => {
    render(
      <RoomDashboardSurface
        {...baseProps}
        households={[
          { id: 'space-1', name: 'Home', role: 'owner' },
          { id: 'space-2', name: 'Cabin', role: 'owner' },
          { id: 'space-3', name: 'Office', role: 'owner' },
          { id: 'space-4', name: 'Garage', role: 'owner' },
          { id: 'space-5', name: 'Storage', role: 'owner' },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'New Space' })).toBeDisabled()
    expect(screen.getByText('You can have up to 5 Inventory Spaces.')).toBeInTheDocument()
  })

  it('maps create space limit errors to deterministic max-5 message', async () => {
    mockCreateHousehold.mockResolvedValue({
      data: null,
      error: 'Inventory space limit reached (max 5)',
      errorCode: 'household_limit_reached',
    })

    render(<RoomDashboardSurface {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'New Space' }))

    await waitFor(() => {
      expect(screen.getByText('You can have up to 5 Inventory Spaces.')).toBeInTheDocument()
    })
  })

  it('shows warning flow for deleting non-empty selected space', async () => {
    mockDeleteInventorySpace.mockResolvedValue({
      success: false,
      error: 'Inventory space contains rooms and requires warning confirmation before deletion',
      errorCode: 'warning_required',
      warning: {
        hasRooms: true,
        roomCount: 2,
      },
    })

    render(<RoomDashboardSurface {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit selected space' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected space' }))

    await waitFor(() => {
      expect(
        screen.getByText('This space has 2 room(s). Confirm deletion to continue.'),
      ).toBeInTheDocument()
    })
  })

  it('renders item name and amount inline with expiry as secondary row', () => {
    render(
      <RoomDashboardSurface
        {...baseProps}
        items={[
          {
            ...baseProps.items[0],
            expiry_date: '2026-03-20T00:00:00.000Z',
          },
        ]}
      />,
    )

    const detailLink = screen.getByRole('link', { name: /Milk/ })
    expect(detailLink).toHaveTextContent(/Milk\s*1 carton/)
    expect(detailLink).toHaveTextContent(/Expires/)
  })

  it('hides add item action while room edit mode is active', () => {
    render(<RoomDashboardSurface {...baseProps} />)

    expect(screen.getByRole('link', { name: 'Add Item' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Room' }))
    expect(screen.queryByRole('link', { name: 'Add Item' })).not.toBeInTheDocument()
  })
})
