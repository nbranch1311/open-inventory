import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserHouseholds } from '@/actions/household'
import { getRoomsForHousehold } from '@/actions/rooms'
import { getProductsForHousehold } from '@/actions/products'
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel'
import { Alert } from '@/components/ui/Alert'
import { WorkspaceRoomPicker } from './workspace-room-picker'

type PageProps = {
  searchParams: Promise<{ space?: string; room?: string }>
}

export default async function BusinessDashboardPage({ searchParams }: PageProps) {
  const { space, room } = await searchParams
  const households = await getUserHouseholds()

  if (!households) {
    redirect('/login')
  }

  if (households.length === 0) {
    redirect('/onboarding')
  }

  const selectedHouseholdId = space ?? households[0].id
  const selectedHousehold = households.find((h) => h.id === selectedHouseholdId) ?? households[0]

  // Business-first UX: guide user to switch, but do not hard block yet.
  const workspaceType = (selectedHousehold as { workspace_type?: string }).workspace_type ?? 'personal'

  const roomsResult = await getRoomsForHousehold(selectedHouseholdId)
  const rooms = roomsResult.data ?? []
  const selectedRoomId = room ?? rooms[0]?.id ?? ''
  const products = await getProductsForHousehold(selectedHouseholdId)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AIAssistantPanel householdId={selectedHouseholdId} />
      </div>
      {workspaceType !== 'business' ? (
        <Alert>
          This workspace is currently in personal mode. Business workflows are available, but you may want a dedicated
          business workspace for clean separation.
        </Alert>
      ) : null}

      <section className="space-y-3 rounded-lg border border-(--border) bg-(--card) p-4">
        <WorkspaceRoomPicker
          workspaces={households.map((household) => ({ id: household.id, name: household.name }))}
          selectedWorkspaceId={selectedHouseholdId}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
        />

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:brightness-110"
            href={`/dashboard/business/receive?space=${selectedHouseholdId}&room=${selectedRoomId}`}
          >
            Receive stock
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-(--border) bg-(--card) px-4 py-2 text-sm font-medium text-foreground hover:bg-(--muted)"
            href={`/dashboard/business/fulfill?space=${selectedHouseholdId}&room=${selectedRoomId}`}
          >
            Fulfill order
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-(--border) bg-(--card) px-4 py-2 text-sm font-medium text-foreground hover:bg-(--muted)"
            href={`/dashboard/business/adjust?space=${selectedHouseholdId}&room=${selectedRoomId}`}
          >
            Adjust stock
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-(--border) bg-(--card) px-4 py-2 text-sm font-medium text-foreground hover:bg-(--muted)"
            href={`/dashboard/business/import?space=${selectedHouseholdId}`}
          >
            Import CSV
          </Link>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-(--border) bg-(--card) p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-(--muted-foreground)">{products.length} total</p>
        </div>

        {products.length === 0 ? (
          <Alert>No products yet. Receive stock or import a CSV to get started.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/dashboard/business/products/${product.id}?space=${selectedHouseholdId}`}
                className="rounded-md border border-(--border) bg-background p-3 hover:bg-(--muted)"
                aria-label={`View product ${product.name}`}
              >
                <p className="font-medium text-foreground">{product.name}</p>
                <p className="text-sm text-(--muted-foreground)">
                  SKU: {product.sku ?? '—'} | On hand: {product.stockOnHand} {product.unit ?? ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Alert>
        Current limitations: business flows are foundational (receive/fulfill/adjust + CSV import). Integrations and
        analytics will be layered on top of movements.
      </Alert>
    </div>
  )
}

