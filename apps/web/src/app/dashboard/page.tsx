import { getUserHouseholds } from '@/actions/household'
import {
  getCategoriesForHousehold,
  getLocationsForHousehold,
  searchInventoryItems,
} from '@/actions/inventory'
import { getUpcomingReminders } from '@/actions/reminders'
import { DashboardSearchControls } from '@/components/inventory/DashboardSearchControls'
import { InventoryEmptyState } from '@/components/inventory/InventoryEmptyState'
import { InventoryNoResultsState } from '@/components/inventory/InventoryNoResultsState'
import { UpcomingRemindersSection } from '@/components/reminders/UpcomingRemindersSection'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const households = await getUserHouseholds()

  if (!households || households.length === 0) {
    redirect('/onboarding')
  }

  const selectedHousehold = households[0]
  const params = await searchParams

  const q = typeof params?.q === 'string' ? params.q : undefined
  const categoryId = typeof params?.category === 'string' ? params.category : undefined
  const locationId = typeof params?.location === 'string' ? params.location : undefined
  const sortBy =
    typeof params?.sort === 'string' &&
    (params.sort === 'recent' || params.sort === 'name' || params.sort === 'expiration')
      ? params.sort
      : 'recent'

  const hasSearchParams = Boolean(
    q || categoryId || locationId || (typeof params?.sort === 'string' && params.sort !== 'recent'),
  )

  const { data: items, error } = await searchInventoryItems(selectedHousehold.id, {
    keyword: q,
    categoryId,
    locationId,
    sortBy,
    sortOrder:
      sortBy === 'name'
        ? 'asc'
        : sortBy === 'expiration'
          ? 'asc'
          : 'desc',
  })

  const [categoriesRes, locationsRes, remindersRes] = await Promise.all([
    getCategoriesForHousehold(selectedHousehold.id),
    getLocationsForHousehold(selectedHousehold.id),
    getUpcomingReminders(selectedHousehold.id, 10),
  ])

  const categories = categoriesRes.data ?? []
  const locations = locationsRes.data ?? []
  const upcomingReminders = remindersRes.error ? [] : (remindersRes.data ?? [])
  const remindersError = remindersRes.error

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        Error loading inventory: {error}
      </div>
    )
  }

  const isEmpty = !items || items.length === 0
  const showNoResultsState = isEmpty && hasSearchParams

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{selectedHousehold.name} Inventory</h1>
        <Link
          href="/dashboard/add"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-[var(--primary-foreground)] transition-colors hover:brightness-110"
        >
          Add Item
        </Link>
      </div>

      <Suspense fallback={null}>
        <DashboardSearchControls
          categories={categories}
          locations={locations}
        />
      </Suspense>

      <div className="mb-6">
        {remindersError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Could not load reminders. {remindersError}
            </p>
          </div>
        ) : (
          <UpcomingRemindersSection
            reminders={upcomingReminders}
            householdId={selectedHousehold.id}
          />
        )}
      </div>

      {showNoResultsState ? (
        <InventoryNoResultsState />
      ) : isEmpty ? (
        <InventoryEmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/${item.id}?household=${selectedHousehold.id}`}
              className="block rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{item.name}</h3>
                  <p className="text-[var(--muted-foreground)]">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                {item.expiry_date && (
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    new Date(item.expiry_date) < new Date() 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
