import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthForm } from './AuthForm'

describe('AuthForm', () => {
  it('renders login baseline content and route link', () => {
    render(
      <AuthForm
        mode="login"
        title="Sign in to your account"
        description="Use your OpenInventory credentials to continue."
        submitLabel="Sign in"
        switchHref="/signup"
        switchLabel="Create an account"
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument()
    expect(screen.getByText('Use your OpenInventory credentials to continue.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('submits email and password and disables button while pending', async () => {
    const onSubmit = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    render(
      <AuthForm
        mode="signup"
        title="Create your account"
        description="Start organizing your Inventory Space."
        submitLabel="Sign up"
        switchHref="/login"
        switchLabel="Sign in"
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'strongpass123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    const pendingButton = screen.getByRole('button', { name: 'Creating account...' })
    expect(pendingButton).toBeDisabled()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'strongpass123',
      })
    })
  })

  it('shows an error alert when submit fails', async () => {
    render(
      <AuthForm
        mode="login"
        title="Sign in"
        description="Sign in"
        submitLabel="Sign in"
        switchHref="/signup"
        switchLabel="Sign up"
        onSubmit={vi.fn().mockRejectedValue(new Error('Invalid credentials'))}
      />,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })
  })
})
