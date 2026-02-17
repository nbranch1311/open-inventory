'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { adjustStockTo } from '@/actions/movements'
import type { ProductWithStock } from '@/actions/products'
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

export function AdjustStockForm({ householdId, rooms, roomId, products }: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(roomId)
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [targetQuantity, setTargetQuantity] = useState('0')
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
      const result = await adjustStockTo({
        householdId,
        productId,
        roomId: selectedRoomId || null,
        targetQuantity: Number(targetQuantity),
        note: note || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess('Stock adjusted.')
      setNote('')
    } catch {
      setError('Failed to adjust stock.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Adjust Stock</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business?space=${householdId}&room=${selectedRoomId}`}>Back</Link>
        </Button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="adjust-room" className="text-sm font-medium text-(--muted-foreground)">
            Location (Room)
          </label>
          <Select
            id="adjust-room"
            aria-label="Select adjustment location"
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
          <label htmlFor="adjust-product" className="text-sm font-medium text-(--muted-foreground)">
            Product
          </label>
          <Select
            id="adjust-product"
            aria-label="Select product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={products.length === 0}
          >
            {products.length === 0 ? <option value="">No products available</option> : null}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (On hand: {product.stockOnHand})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="adjust-target" className="text-sm font-medium text-(--muted-foreground)">
              Target quantity (absolute)
            </label>
            <Input
              id="adjust-target"
              type="number"
              min="0"
              step="1"
              value={targetQuantity}
              onChange={(event) => setTargetQuantity(event.target.value)}
              disabled={!productId}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="adjust-note" className="text-sm font-medium text-(--muted-foreground)">
              Note (optional)
            </label>
            <Input id="adjust-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {success ? <Alert>{success}</Alert> : null}

        <Button type="submit" disabled={pending || !productId}>
          {pending ? 'Saving...' : 'Record adjustment'}
        </Button>
      </form>
    </div>
  )
}

