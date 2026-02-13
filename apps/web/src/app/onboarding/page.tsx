'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHousehold } from '@/actions/household'
import { Loader2 } from 'lucide-react'

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
      await createHousehold(householdName)
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to create household. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Welcome! Let&apos;s get started.
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your first household to start managing your inventory.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleCreateHousehold}>
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="household-name" className="sr-only">
                Household Name
              </label>
              <input
                id="household-name"
                name="householdName"
                type="text"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Household Name (e.g. Home)"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Household
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
