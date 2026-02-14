import { getUserHouseholds } from '@/actions/household'
import { getInventoryItems } from '@/actions/inventory'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const households = await getUserHouseholds()

  if (!households || households.length === 0) {
    redirect('/onboarding')
  }

  const selectedHousehold = households[0]
  const { data: items, error } = await getInventoryItems(selectedHousehold.id)

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        Error loading inventory: {error}
      </div>
    )
  }

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

      {items && items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--border)] py-10 text-center sm:py-12">
          <p className="mb-4 text-[var(--muted-foreground)]">No items in inventory yet.</p>
          <Link
            href="/dashboard/add"
            className="inline-flex min-h-11 items-center text-[var(--primary)] hover:underline"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/${item.id}`}
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
