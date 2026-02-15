import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reminders from '@/actions/reminders'
import { ItemRemindersSection } from './ItemRemindersSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('@/actions/reminders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/actions/reminders')>()
  return {
    ...actual,
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    completeReminder: vi.fn(),
    snoozeReminder: vi.fn(),
    deleteReminder: vi.fn(),
  }
})

const mockReminder = {
  id: 'rem-1',
  item_id: 'item-1',
  household_id: 'hh-1',
  reminder_date: '2026-02-20T12:00:00.000Z',
  message: 'Check expiry',
  is_completed: false,
  snoozed_until: null,
  created_at: '2026-02-14T00:00:00.000Z',
  updated_at: '2026-02-14T00:00:00.000Z',
}

describe('ItemRemindersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no reminders', () => {
    render(
      <ItemRemindersSection
        householdId="hh-1"
        itemId="item-1"
        reminders={[]}
      />,
    )

    expect(screen.getByText('Reminders')).toBeInTheDocument()
    expect(screen.getByText(/No reminders yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('renders reminder list when reminders exist', () => {
    render(
      <ItemRemindersSection
        householdId="hh-1"
        itemId="item-1"
        reminders={[mockReminder]}
      />,
    )

    expect(screen.getByText('Check expiry')).toBeInTheDocument()
    expect(screen.getByLabelText('Mark complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit reminder')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete reminder')).toBeInTheDocument()
  })

  it('shows form when Add is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ItemRemindersSection
        householdId="hh-1"
        itemId="item-1"
        reminders={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Reminder' })).toBeInTheDocument()
  })

  it('calls completeReminder when complete is clicked', async () => {
    vi.mocked(reminders.completeReminder).mockResolvedValue({
      data: { ...mockReminder, is_completed: true },
    })

    const user = userEvent.setup()
    render(
      <ItemRemindersSection
        householdId="hh-1"
        itemId="item-1"
        reminders={[mockReminder]}
      />,
    )

    await user.click(screen.getByLabelText('Mark complete'))

    expect(reminders.completeReminder).toHaveBeenCalledWith('hh-1', 'rem-1')
  })
})
