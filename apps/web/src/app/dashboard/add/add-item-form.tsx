'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

type AddItemFormState = {
  error: string | null
}

type AddItemFormProps = {
  action: (state: AddItemFormState, formData: FormData) => Promise<AddItemFormState>
  rooms: Array<{ id: string; name: string }>
  defaultRoomId?: string | null
}

const initialState: AddItemFormState = {
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? 'Saving...' : 'Add Item'}
    </Button>
  )
}

export function AddItemForm({ action, rooms, defaultRoomId }: AddItemFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            type="number"
            name="quantity"
            id="quantity"
            required
            step="0.01"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input
            type="text"
            name="unit"
            id="unit"
            required
            className="mt-1"
            placeholder="pcs, kg, l"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="roomId">Room</Label>
        <Select
          id="roomId"
          name="roomId"
          defaultValue={defaultRoomId ?? rooms[0]?.id ?? ''}
          required
          className="mt-1"
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          name="description"
          id="description"
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="expiryDate">Expiry Date</Label>
        <Input
          type="date"
          name="expiryDate"
          id="expiryDate"
          className="mt-1"
        />
      </div>

      {state.error && (
        <Alert variant="destructive">{state.error}</Alert>
      )}

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  )
}
