'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHousehold } from '@/actions/household'
import { createClient } from '@/utils/supabase/client'
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
  const [inventorySpaceName, setInventorySpaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      const { data } = await supabase.auth.getSession()
      if (!cancelled && !data.session) {
        router.replace('/login')
      }
    }

    void ensureSession()

    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const handleCreateInventorySpace = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createHousehold(inventorySpaceName)

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
      setError('Failed to create inventory space. Please try again.')
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
            Create your first Inventory Space to start managing your inventory.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateInventorySpace}>
            <div className="space-y-2">
              <Label htmlFor="inventory-space-name">Inventory Space Name</Label>
              <Input
                id="inventory-space-name"
                name="inventorySpaceName"
                type="text"
                required
                value={inventorySpaceName}
                onChange={(event) => setInventorySpaceName(event.target.value)}
                placeholder="Inventory Space Name (e.g. Home)"
              />
            </div>

            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating inventory space...
                </>
              ) : (
                'Create Inventory Space'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
