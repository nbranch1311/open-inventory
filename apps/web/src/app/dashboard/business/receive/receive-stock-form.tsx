'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createProduct, type ProductWithStock } from '@/actions/products'
import { recordReceiving } from '@/actions/movements'
import type { Room } from '@/actions/rooms'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

type Props = {
  householdId: string
  rooms: Room[]
  roomId: string
  products: ProductWithStock[]
}

export function ReceiveStockForm({ householdId, rooms, roomId, products }: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(roomId)
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [productName, setProductName] = useState('')
  const [sku, setSku] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const roomOptions = useMemo(() => rooms, [rooms])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    try {
      let resolvedProductId = productId
      if (!resolvedProductId) {
        const createResult = await createProduct(householdId, {
          name: productName,
          sku: sku || undefined,
        })
        if (createResult.error || !createResult.data) {
          setError(createResult.error ?? 'Failed to create product')
          return
        }
        resolvedProductId = createResult.data.id
      }

      const moveResult = await recordReceiving({
        householdId,
        productId: resolvedProductId,
        roomId: selectedRoomId || null,
        quantity: Number(quantity),
        note: note || undefined,
      })
      if (moveResult.error) {
        setError(moveResult.error)
        return
      }

      setSuccess('Stock received successfully.')
      setProductName('')
      setSku('')
      setQuantity('1')
      setNote('')
    } catch {
      setError('Failed to receive stock.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Receive Stock</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business?space=${householdId}&room=${selectedRoomId}`}>Back</Link>
        </Button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="receive-room" className="text-sm font-medium text-(--muted-foreground)">
            Location (Room)
          </label>
          <Select
            id="receive-room"
            aria-label="Select receive location"
            value={selectedRoomId}
            onChange={(event) => setSelectedRoomId(event.target.value)}
            disabled={roomOptions.length === 0}
          >
            {roomOptions.length === 0 ? <option value="">No rooms available</option> : null}
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="receive-product" className="text-sm font-medium text-(--muted-foreground)">
            Product
          </label>
          <Select
            id="receive-product"
            aria-label="Select product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Create new product...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (On hand: {product.stockOnHand})
              </option>
            ))}
          </Select>
        </div>

        {!productId ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="new-product-name" className="text-sm font-medium text-(--muted-foreground)">
                New product name
              </label>
              <Input
                id="new-product-name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="e.g., Almond Milk"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-product-sku" className="text-sm font-medium text-(--muted-foreground)">
                SKU (optional)
              </label>
              <Input
                id="new-product-sku"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="e.g., MILK-ALM-001"
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="receive-qty" className="text-sm font-medium text-(--muted-foreground)">
              Quantity received
            </label>
            <Input
              id="receive-qty"
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="receive-note" className="text-sm font-medium text-(--muted-foreground)">
              Note (optional)
            </label>
            <Input id="receive-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {success ? <Alert>{success}</Alert> : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Receive stock'}
        </Button>
      </form>
    </div>
  )
}

