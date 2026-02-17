'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import type { ItemDocument } from '@/actions/ItemDocuments'
import type { ItemReminder } from '@/actions/reminders'
import { ItemDocumentsSection } from '@/components/documents/ItemDocumentsSection'
import { ItemRemindersSection } from '@/components/reminders/ItemRemindersSection'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

type ItemFormState = {
  error: string | null
}

type ItemDetail = {
  id: string
  name: string
  quantity: number
  unit: string | null
  description: string | null
  expiry_date: string | null
  household_id: string
}

type ItemDetailFormProps = {
  item: ItemDetail
  documents: ItemDocument[]
  reminders: ItemReminder[]
  updateAction: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>
  deleteAction: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>
}

const initialState: ItemFormState = {
  error: null,
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="destructive"
    >
      {pending ? 'Deleting...' : 'Delete Item'}
    </Button>
  )
}

export function ItemDetailForm({ item, documents, reminders, updateAction, deleteAction }: ItemDetailFormProps) {
  const [updateState, updateFormAction] = useActionState(updateAction, initialState)
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4">
        <Button asChild variant="outline">
          <Link href={`/dashboard?space=${item.household_id}`} prefetch={false}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Edit Item</h1>
        <form action={deleteFormAction}>
          <DeleteButton />
        </form>
      </div>

      {deleteState.error && (
        <Alert variant="destructive" className="mb-4">
          {deleteState.error}
        </Alert>
      )}

      <form action={updateFormAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            type="text"
            name="name"
            id="name"
            defaultValue={item.name}
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
              defaultValue={item.quantity}
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
              defaultValue={item.unit ?? ''}
              required
              className="mt-1"
              placeholder="pcs, kg, l"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={item.description ?? ''}
            className="mt-1"
          />
        </div>

        <ItemDocumentsSection
          householdId={item.household_id}
          itemId={item.id}
          documents={documents}
        />

        <ItemRemindersSection
          householdId={item.household_id}
          itemId={item.id}
          reminders={reminders}
        />

        <div>
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            type="date"
            name="expiryDate"
            id="expiryDate"
            defaultValue={item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : ''}
            className="mt-1"
          />
        </div>

        {updateState.error && (
          <Alert variant="destructive">{updateState.error}</Alert>
        )}

        <div className="pt-4">
          <SaveButton />
        </div>
      </form>
    </div>
  )
}
