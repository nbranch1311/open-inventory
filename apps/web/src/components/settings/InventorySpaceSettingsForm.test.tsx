import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCurrentInventorySpace,
  renameCurrentInventorySpace,
} from '@/actions/household'
import { InventorySpaceSettingsForm } from './InventorySpaceSettingsForm'

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

vi.mock('@/actions/household', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/actions/household')>()
  return {
    ...actual,
    renameCurrentInventorySpace: vi.fn(),
    deleteCurrentInventorySpace: vi.fn(),
  }
})

const settingsFixture = {
  id: 'household-1',
  name: 'My Home',
  createdAt: '2026-02-14T00:00:00.000Z',
  memberRole: 'owner',
  isOwner: true,
}

describe('InventorySpaceSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renames inventory space and shows success state', async () => {
    vi.mocked(renameCurrentInventorySpace).mockResolvedValue({
      data: {
        id: 'household-1',
        name: 'Warehouse',
        updated_at: '2026-02-16T00:00:00.000Z',
      },
      error: null,
      errorCode: null,
    })

    const user = userEvent.setup()
    render(<InventorySpaceSettingsForm settings={settingsFixture} />)

    const nameInput = screen.getByLabelText('Inventory Space name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Warehouse')
    await user.click(screen.getByRole('button', { name: 'Rename Inventory Space' }))

    await waitFor(() => {
      expect(renameCurrentInventorySpace).toHaveBeenCalledWith('Warehouse')
    })

    expect(screen.getByText('Inventory Space name updated.')).toBeInTheDocument()
    expect(screen.getByLabelText('Inventory Space name')).toHaveValue('Warehouse')
  })

  it('blocks delete button until typed confirmation exactly matches', async () => {
    const user = userEvent.setup()
    render(<InventorySpaceSettingsForm settings={settingsFixture} />)

    const deleteButton = screen.getByRole('button', { name: 'Delete Inventory Space' })
    expect(deleteButton).toBeDisabled()

    await user.type(screen.getByLabelText(/Type My Home to confirm/i), 'my home')
    expect(deleteButton).toBeDisabled()

    await user.clear(screen.getByLabelText(/Type My Home to confirm/i))
    await user.type(screen.getByLabelText(/Type My Home to confirm/i), 'My Home')
    expect(deleteButton).toBeEnabled()
  })

  it('shows backend blocked-delete reasons when dependent data exists', async () => {
    vi.mocked(deleteCurrentInventorySpace).mockResolvedValue({
      success: false,
      error: 'Inventory space cannot be deleted while items, documents, or reminders still exist',
      errorCode: 'delete_blocked_has_data',
      blockedBy: {
        inventoryItems: true,
        itemDocuments: false,
        itemReminders: true,
      },
    })

    const user = userEvent.setup()
    render(<InventorySpaceSettingsForm settings={settingsFixture} />)

    await user.type(screen.getByLabelText(/Type My Home to confirm/i), 'My Home')
    await user.click(screen.getByRole('button', { name: 'Delete Inventory Space' }))

    await waitFor(() => {
      expect(deleteCurrentInventorySpace).toHaveBeenCalledWith('My Home')
    })

    expect(
      screen.getByText('Inventory space cannot be deleted while items, documents, or reminders still exist'),
    ).toBeInTheDocument()
    expect(screen.getByText('Inventory items still exist.')).toBeInTheDocument()
    expect(screen.getByText('Item reminders still exist.')).toBeInTheDocument()
    expect(screen.queryByText('Item documents still exist.')).not.toBeInTheDocument()
  })

  it('shows document blocked-delete reason when item documents exist', async () => {
    vi.mocked(deleteCurrentInventorySpace).mockResolvedValue({
      success: false,
      error: 'Inventory space cannot be deleted while items, documents, or reminders still exist',
      errorCode: 'delete_blocked_has_data',
      blockedBy: {
        inventoryItems: false,
        itemDocuments: true,
        itemReminders: false,
      },
    })

    const user = userEvent.setup()
    render(<InventorySpaceSettingsForm settings={settingsFixture} />)

    await user.type(screen.getByLabelText(/Type My Home to confirm/i), 'My Home')
    await user.click(screen.getByRole('button', { name: 'Delete Inventory Space' }))

    await waitFor(() => {
      expect(deleteCurrentInventorySpace).toHaveBeenCalledWith('My Home')
    })

    expect(screen.getByText('Item documents still exist.')).toBeInTheDocument()
    expect(screen.queryByText('Inventory items still exist.')).not.toBeInTheDocument()
    expect(screen.queryByText('Item reminders still exist.')).not.toBeInTheDocument()
  })
})
