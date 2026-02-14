import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

const setThemeMock = vi.fn()
const useThemeMock = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => useThemeMock(),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeMock.mockReset()
    useThemeMock.mockReset()
  })

  it('renders a toggle button with current theme label', async () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: 'light',
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
    })
  })

  it('switches from light to dark theme', async () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: 'light',
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)

    const button = await screen.findByRole('button', { name: 'Switch to dark mode' })
    fireEvent.click(button)

    expect(setThemeMock).toHaveBeenCalledWith('dark')
  })

  it('switches from dark to light theme', async () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)

    const button = await screen.findByRole('button', { name: 'Switch to light mode' })
    fireEvent.click(button)

    expect(setThemeMock).toHaveBeenCalledWith('light')
  })
})
