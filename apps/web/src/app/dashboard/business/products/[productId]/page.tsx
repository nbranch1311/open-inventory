import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProductForHousehold } from '@/actions/products'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

type PageProps = {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ space?: string }>
}

export default async function BusinessProductPage({ params, searchParams }: PageProps) {
  const { productId } = await params
  const { space } = await searchParams

  const householdId = (space ?? '').trim()
  if (!householdId) {
    redirect('/dashboard/business')
  }

  const product = await getProductForHousehold(householdId, productId)
  if (!product) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Alert variant="destructive">Product not found (or you do not have access).</Alert>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href={`/dashboard/business?space=${householdId}`}>Back</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business?space=${householdId}`}>Back</Link>
        </Button>
      </div>

      <section className="space-y-2 rounded-lg border border-(--border) bg-(--card) p-4">
        <p className="text-sm text-(--muted-foreground)">SKU: {product.sku ?? '—'}</p>
        <p className="text-sm text-(--muted-foreground)">Barcode: {product.barcode ?? '—'}</p>
        <p className="text-sm text-(--muted-foreground)">
          On hand: {product.stockOnHand} {product.unit ?? ''}
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/dashboard/business/receive?space=${householdId}`}>Receive stock</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business/fulfill?space=${householdId}`}>Fulfill order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business/adjust?space=${householdId}`}>Adjust stock</Link>
        </Button>
      </section>
    </div>
  )
}

