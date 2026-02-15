import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import {
  completeReminder,
  createReminder,
  deleteReminder,
  getItemReminders,
  getUpcomingReminders,
  snoozeReminder,
  updateReminder,
} from './reminders'

const HOUSEHOLD_ID = 'household-1'
const ITEM_ID = 'item-1'
const REMINDER_ID = 'reminder-1'

const mockReminder = {
  id: REMINDER_ID,
  item_id: ITEM_ID,
  household_id: HOUSEHOLD_ID,
  reminder_date: '2026-02-20T12:00:00.000Z',
  message: 'Check expiry',
  is_completed: false,
  snoozed_until: null,
  created_at: '2026-02-14T00:00:00.000Z',
  updated_at: '2026-02-14T00:00:00.000Z',
}

function createChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn()
  return chain
}

function createSupabaseHarness(
  inventoryResult: { data?: unknown; error: unknown },
  remindersResult: { data?: unknown; error: unknown },
) {
  const inventoryChain = createChain()
  inventoryChain.single.mockResolvedValue(inventoryResult)

  const remindersChain = createChain()
  remindersChain.single.mockResolvedValue(remindersResult)
  remindersChain.then = function (resolve: (v: unknown) => void) {
    queueMicrotask(() => resolve(remindersResult))
    return Promise.resolve(remindersResult)
  }
  remindersChain.catch = () => remindersChain

  const from = vi.fn((table: string) => {
    if (table === 'inventory_items') return inventoryChain
    if (table === 'item_reminders') return remindersChain
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: { from },
    inventoryChain,
    remindersChain,
  }
}

describe('getItemReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns reminders when item belongs to household', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: [mockReminder], error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getItemReminders(HOUSEHOLD_ID, ITEM_ID)

    expect(result.data).toEqual([mockReminder])
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(harness.remindersChain.eq).toHaveBeenCalledWith('item_id', ITEM_ID)
  })

  it('returns error when item not found for household', async () => {
    const harness = createSupabaseHarness(
      { data: null, error: { message: 'not found' } },
      { data: [], error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getItemReminders(HOUSEHOLD_ID, ITEM_ID)

    expect(result.error).toBe('Item not found for household')
    expect(result.data).toBeUndefined()
  })
})

describe('createReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates reminder when item belongs to household', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: mockReminder, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createReminder(HOUSEHOLD_ID, ITEM_ID, {
      reminder_date: '2026-02-20T12:00:00.000Z',
      message: 'Check expiry',
    })

    expect(result.data).toEqual(mockReminder)
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        reminder_date: '2026-02-20T12:00:00.000Z',
        message: 'Check expiry',
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/${ITEM_ID}`)
  })

  it('returns error when reminder_date is empty', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: null, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createReminder(HOUSEHOLD_ID, ITEM_ID, {
      reminder_date: '',
      message: 'Test',
    })

    expect(result.error).toBe('Reminder date is required')
    expect(result.data).toBeUndefined()
  })

  it('returns error when reminder_date is invalid', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: null, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createReminder(HOUSEHOLD_ID, ITEM_ID, {
      reminder_date: 'not-a-date',
      message: 'Test',
    })

    expect(result.error).toBe('Invalid reminder date')
    expect(result.data).toBeUndefined()
  })

  it('returns error when item not found for household', async () => {
    const harness = createSupabaseHarness(
      { data: null, error: { message: 'not found' } },
      { data: null, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await createReminder(HOUSEHOLD_ID, ITEM_ID, {
      reminder_date: '2026-02-20T12:00:00.000Z',
    })

    expect(result.error).toBe('Item not found for household')
    expect(result.data).toBeUndefined()
  })
})

describe('updateReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates reminder when household matches', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: { ...mockReminder, message: 'Updated' }, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await updateReminder(HOUSEHOLD_ID, REMINDER_ID, {
      message: 'Updated',
    })

    expect(result.data?.message).toBe('Updated')
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Updated' }),
    )
  })

  it('returns error when no fields to update', async () => {
    mockCreateClient.mockResolvedValue({ from: vi.fn() })

    const result = await updateReminder(HOUSEHOLD_ID, REMINDER_ID, {})

    expect(result.error).toBe('No fields to update')
    expect(result.data).toBeUndefined()
  })

  it('returns error when reminder_date is invalid', async () => {
    mockCreateClient.mockResolvedValue({ from: vi.fn() })

    const result = await updateReminder(HOUSEHOLD_ID, REMINDER_ID, {
      reminder_date: 'invalid',
    })

    expect(result.error).toBe('Invalid reminder date')
    expect(result.data).toBeUndefined()
  })
})

describe('completeReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks reminder as completed', async () => {
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: { ...mockReminder, is_completed: true }, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await completeReminder(HOUSEHOLD_ID, REMINDER_ID)

    expect(result.data?.is_completed).toBe(true)
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: true, snoozed_until: null }),
    )
  })
})

describe('snoozeReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('snoozes reminder until given date', async () => {
    const snoozedUntil = '2026-02-21T12:00:00.000Z'
    const harness = createSupabaseHarness(
      { data: { id: ITEM_ID }, error: null },
      { data: { ...mockReminder, snoozed_until: snoozedUntil }, error: null },
    )
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await snoozeReminder(HOUSEHOLD_ID, REMINDER_ID, snoozedUntil)

    expect(result.data?.snoozed_until).toBe(snoozedUntil)
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ snoozed_until: snoozedUntil }),
    )
  })

  it('returns error when snoozedUntil is invalid', async () => {
    mockCreateClient.mockResolvedValue({ from: vi.fn() })

    const result = await snoozeReminder(HOUSEHOLD_ID, REMINDER_ID, 'invalid')

    expect(result.error).toBe('Invalid snooze date')
    expect(result.data).toBeUndefined()
  })
})

describe('deleteReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes reminder when household matches', async () => {
    const remindersChain = createChain()
    remindersChain.single.mockResolvedValue({ data: { item_id: ITEM_ID }, error: null })
    remindersChain.then = function (resolve: (v: unknown) => void) {
      queueMicrotask(() => resolve({ error: null }))
      return Promise.resolve({ error: null })
    }
    remindersChain.catch = () => remindersChain

    const from = vi.fn(() => remindersChain)

    mockCreateClient.mockResolvedValue({ from })

    const result = await deleteReminder(HOUSEHOLD_ID, REMINDER_ID)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns error when reminder not found', async () => {
    const remindersChain = createChain()
    remindersChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const from = vi.fn(() => remindersChain)

    mockCreateClient.mockResolvedValue({ from })

    const result = await deleteReminder(HOUSEHOLD_ID, REMINDER_ID)

    expect(result.error).toBe('Reminder not found')
    expect(result.success).toBeUndefined()
  })
})

describe('getUpcomingReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches upcoming reminders scoped by household', async () => {
    const harness = createSupabaseHarness(
      { data: null, error: null },
      {
        data: [{ ...mockReminder, inventory_items: { id: ITEM_ID, name: 'Test Item' } }],
        error: null,
      },
    )
    harness.remindersChain.then = (resolve: (v: unknown) => void) => {
      queueMicrotask(() =>
        resolve({
          data: [{ ...mockReminder, inventory_items: { id: ITEM_ID, name: 'Test Item' } }],
          error: null,
        }),
      )
      return Promise.resolve({ data: [], error: null })
    }
    mockCreateClient.mockResolvedValue(harness.client)

    const result = await getUpcomingReminders(HOUSEHOLD_ID, 10)

    expect(result.data).toBeDefined()
    expect(result.data?.length).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
    expect(harness.remindersChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID)
    expect(harness.remindersChain.eq).toHaveBeenCalledWith('is_completed', false)
    expect(harness.remindersChain.or).toHaveBeenCalled()
  })
})
