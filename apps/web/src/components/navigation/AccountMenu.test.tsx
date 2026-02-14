import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AccountMenu } from './AccountMenu'

describe('AccountMenu', () => {
  it('renders desktop account trigger with email and avatar fallback', () => {
    render(<AccountMenu email="owner@example.com" signOutAction={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument()
    expect(screen.getByText('O')).toBeInTheDocument()
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
  })

  it('opens desktop account menu and shows sign-out action', () => {
    render(<AccountMenu email="owner@example.com" signOutAction={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))

    expect(screen.getByText('Signed in as')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('opens mobile navigation path and exposes account section', () => {
    render(<AccountMenu email="owner@example.com" signOutAction={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open mobile navigation' }))

    expect(screen.getAllByText('Account')[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[1]).toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0)
  })
})
