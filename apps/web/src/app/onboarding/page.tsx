'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHousehold } from '@/actions/household'
import { Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export default function OnboardingPage() {
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createHousehold(householdName)

      if (result.errorCode === 'unauthenticated') {
        router.push('/login')
        return
      }

      if (result.error) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Failed to create household. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>Welcome! Let&apos;s get started.</CardTitle>
          <CardDescription>
            Create your first household to start managing your inventory.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateHousehold}>
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                name="householdName"
                type="text"
                required
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                placeholder="Household Name (e.g. Home)"
              />
            </div>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating household...
                </>
              ) : (
                'Create Household'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
