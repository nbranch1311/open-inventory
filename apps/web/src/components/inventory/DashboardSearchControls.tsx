'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
type DashboardSearchControlsProps = {
  categories: { id: string; name: string }[]
  locations: { id: string; name: string }[]
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'expiration', label: 'Expiration (soonest)' },
] as const

const DEBOUNCE_MS = 300

export function DashboardSearchControls({
  categories,
  locations,
}: DashboardSearchControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(() => searchParams.get('q') ?? '')

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const location = searchParams.get('location') ?? ''
  const sort = searchParams.get('sort') ?? 'recent'

  const hasActiveFilters = Boolean(q || category || location || sort !== 'recent')

  const updateParams = useCallback(
    (updates: { q?: string; category?: string; location?: string; sort?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === undefined) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      router.push(`/dashboard?${params.toString()}`)
    },
    [router, searchParams],
  )

  useEffect(() => {
    if (keyword === q) return
    const timer = setTimeout(() => {
      updateParams({ q: keyword || undefined })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [keyword, q, updateParams])

  const handleClearFilters = useCallback(() => {
    setKeyword('')
    router.push('/dashboard')
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      updateParams({ q: keyword || undefined })
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Search items..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 pr-9 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] sm:text-sm"
            aria-label="Search inventory"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => updateParams({ category: e.target.value || undefined })}
              className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {locations.length > 0 && (
            <select
              value={location}
              onChange={(e) => updateParams({ location: e.target.value || undefined })}
              className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              aria-label="Filter by location"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={sort}
            onChange={(e) =>
              updateParams({
                sort: e.target.value === 'recent' ? undefined : e.target.value,
              })
            }
            className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-11 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
