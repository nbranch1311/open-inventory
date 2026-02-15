import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InventoryEmptyState } from './InventoryEmptyState'

describe('InventoryEmptyState', () => {
  it('renders empty state message and CTA', () => {
    render(<InventoryEmptyState />)

    expect(screen.getByText('No items in inventory yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your first item to get started.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first item' })).toBeInTheDocument()
  })

  it('links to add item page', () => {
    render(<InventoryEmptyState />)

    const link = screen.getByRole('link', { name: 'Add your first item' })
    expect(link).toHaveAttribute('href', '/dashboard/add')
  })

  it('has accessible status for screen readers', () => {
    render(<InventoryEmptyState />)

    expect(screen.getByRole('status', { name: 'Inventory is empty' })).toBeInTheDocument()
  })
})
