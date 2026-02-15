import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardSearchControls } from './DashboardSearchControls'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('DashboardSearchControls', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders search input', () => {
    render(<DashboardSearchControls categories={[]} locations={[]} />)

    expect(screen.getByRole('searchbox', { name: 'Search inventory' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('renders sort dropdown', () => {
    render(<DashboardSearchControls categories={[]} locations={[]} />)

    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeInTheDocument()
  })

  it('renders category filter when categories exist', () => {
    render(
      <DashboardSearchControls
        categories={[{ id: 'c1', name: 'Electronics' }]}
        locations={[]}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Filter by category' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All categories' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Electronics' })).toBeInTheDocument()
  })

  it('renders location filter when locations exist', () => {
    render(
      <DashboardSearchControls
        categories={[]}
        locations={[{ id: 'l1', name: 'Kitchen' }]}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Filter by location' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All locations' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument()
  })

  it('does not render category filter when categories empty', () => {
    render(<DashboardSearchControls categories={[]} locations={[]} />)

    expect(screen.queryByRole('combobox', { name: 'Filter by category' })).not.toBeInTheDocument()
  })

  it('does not render location filter when locations empty', () => {
    render(<DashboardSearchControls categories={[]} locations={[]} />)

    expect(screen.queryByRole('combobox', { name: 'Filter by location' })).not.toBeInTheDocument()
  })
})
