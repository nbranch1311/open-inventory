'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function InventoryNoResultsState() {
  const router = useRouter()

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] py-10 text-center sm:py-14"
      role="status"
      aria-label="No search results"
    >
      <Search
        className="mb-4 size-12 text-[var(--muted-foreground)] opacity-60"
        aria-hidden
      />
      <p className="mb-1 text-base font-medium text-[var(--foreground)]">
        No items match your search or filters.
      </p>
      <p className="mb-6 text-sm text-[var(--muted-foreground)]">
        Try different keywords or clear filters to see all items.
      </p>
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      >
        Clear filters
      </button>
    </div>
  )
}
