import { Package } from 'lucide-react'
import Link from 'next/link'

export function InventoryEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] py-10 text-center sm:py-14"
      role="status"
      aria-label="Inventory is empty"
    >
      <Package
        className="mb-4 size-12 text-[var(--muted-foreground)] opacity-60"
        aria-hidden
      />
      <p className="mb-1 text-base font-medium text-[var(--foreground)]">
        No items in inventory yet.
      </p>
      <p className="mb-6 text-sm text-[var(--muted-foreground)]">
        Add your first item to get started.
      </p>
      <Link
        href="/dashboard/add"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      >
        Add your first item
      </Link>
    </div>
  )
}
