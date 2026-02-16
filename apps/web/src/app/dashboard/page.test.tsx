import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from './page'

const mockGetUserHouseholds = vi.fn()
const mockSearchInventoryItems = vi.fn()
const mockGetRoomsForHousehold = vi.fn()
const mockGetUpcomingReminders = vi.fn()
const mockRedirect = vi.fn()
const mockRoomDashboardSurface = vi.fn<(props: unknown) => void>()

vi.mock('@/actions/household', () => ({
  getUserHouseholds: (...args: unknown[]) => mockGetUserHouseholds(...args),
}))

vi.mock('@/actions/inventory', () => ({
  searchInventoryItems: (...args: unknown[]) => mockSearchInventoryItems(...args),
}))

vi.mock('@/actions/rooms', () => ({
  getRoomsForHousehold: (...args: unknown[]) => mockGetRoomsForHousehold(...args),
}))

vi.mock('@/actions/reminders', () => ({
  getUpcomingReminders: (...args: unknown[]) => mockGetUpcomingReminders(...args),
}))

vi.mock('@/components/inventory/RoomDashboardSurface', () => ({
  RoomDashboardSurface: (props: unknown) => {
    mockRoomDashboardSurface(props)
    return <div data-testid="room-dashboard-surface">Room surface</div>
  },
}))

vi.mock('@/components/reminders/UpcomingRemindersSection', () => ({
  UpcomingRemindersSection: () => <div>Upcoming reminders</div>,
}))

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

describe('DashboardPage', () => {
  it('uses selected space from query and passes filtered room items to room surface', async () => {
    mockGetUserHouseholds.mockResolvedValue([
      { id: 'space-1', name: 'Home', role: 'owner' },
      { id: 'space-2', name: 'Cabin', role: 'owner' },
    ])
    mockGetUpcomingReminders.mockResolvedValue({ data: [], error: null })
    mockSearchInventoryItems.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          household_id: 'space-2',
          room_id: 'room-a',
          name: 'Battery',
          quantity: 2,
          unit: 'pcs',
          description: null,
          category_id: null,
          location_id: null,
          status: 'active',
          expiry_date: null,
          purchase_date: null,
          created_at: '2026-02-16T00:00:00.000Z',
          updated_at: '2026-02-16T00:00:00.000Z',
        },
        {
          id: 'item-2',
          household_id: 'space-2',
          room_id: 'room-b',
          name: 'Soda',
          quantity: 6,
          unit: 'can',
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
      error: null,
    })
    mockGetRoomsForHousehold.mockImplementation(async (householdId: string) => {
      if (householdId === 'space-2') {
        return {
          data: [
            {
              id: 'room-a',
              household_id: 'space-2',
              name: 'Storage',
              created_at: '2026-02-16T00:00:00.000Z',
              updated_at: '2026-02-16T00:00:00.000Z',
            },
            {
              id: 'room-b',
              household_id: 'space-2',
              name: 'Kitchen',
              created_at: '2026-02-16T00:00:00.000Z',
              updated_at: '2026-02-16T00:00:00.000Z',
            },
          ],
        }
      }
      return { data: [] }
    })

    const ui = await DashboardPage({
      searchParams: Promise.resolve({
        space: 'space-2',
        room: 'room-b',
      }),
    })

    render(ui)

    expect(screen.getByText('Cabin Inventory')).toBeInTheDocument()
    expect(screen.getByTestId('room-dashboard-surface')).toBeInTheDocument()
    expect(mockSearchInventoryItems).toHaveBeenCalledWith(
      'space-2',
      expect.objectContaining({ sortBy: 'recent' }),
    )

    const props = mockRoomDashboardSurface.mock.calls[0][0] as {
      selectedHouseholdId: string
      selectedRoomId: string
      items: Array<{ id: string }>
    }
    expect(props.selectedHouseholdId).toBe('space-2')
    expect(props.selectedRoomId).toBe('room-b')
    expect(props.items).toHaveLength(1)
    expect(props.items[0].id).toBe('item-2')
  })
})
