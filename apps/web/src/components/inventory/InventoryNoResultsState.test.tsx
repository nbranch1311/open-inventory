import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryNoResultsState } from './InventoryNoResultsState'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('InventoryNoResultsState', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders no-results message', () => {
    render(<InventoryNoResultsState />)

    expect(
      screen.getByText('No items match your search or filters.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Try different keywords or clear filters to see all items.'),
    ).toBeInTheDocument()
  })

  it('has clear filters button', () => {
    render(<InventoryNoResultsState />)

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('has accessible status for screen readers', () => {
    render(<InventoryNoResultsState />)

    expect(screen.getByRole('status', { name: 'No search results' })).toBeInTheDocument()
  })

  it('navigates to dashboard when clear filters is clicked', async () => {
    const user = userEvent.setup()
    render(<InventoryNoResultsState />)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
