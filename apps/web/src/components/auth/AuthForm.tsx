'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

type AuthFormMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthFormMode
  title: string
  description: string
  submitLabel: string
  switchHref: string
  switchLabel: string
  onSubmit: (values: { email: string; password: string }) => Promise<void>
}

function getPendingLabel(mode: AuthFormMode) {
  return mode === 'login' ? 'Signing in...' : 'Creating account...'
}

export function AuthForm({
  mode,
  title,
  description,
  submitLabel,
  switchHref,
  switchLabel,
  onSubmit,
}: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit({ email, password })
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'An unexpected error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-email`}>Email</Label>
              <Input
                id={`${mode}-email`}
                name="email"
                type="email"
                // Many password managers key off `autocomplete="username"` even if the value is an email.
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-password`}>Password</Label>
              <Input
                id={`${mode}-password`}
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {getPendingLabel(mode)}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <Button asChild variant="link">
            <Link href={switchHref}>{switchLabel}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
