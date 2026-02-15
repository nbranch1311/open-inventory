'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { ItemDocument } from '@/actions/ItemDocuments'
import type { ItemReminder } from '@/actions/reminders'
import { ItemDocumentsSection } from '@/components/documents/ItemDocumentsSection'
import { ItemRemindersSection } from '@/components/reminders/ItemRemindersSection'

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
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full justify-center rounded-md border border-transparent bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:brightness-110 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--destructive)] px-4 py-2 text-[var(--destructive-foreground)] transition-colors hover:brightness-110 disabled:opacity-70"
    >
      {pending ? 'Deleting...' : 'Delete Item'}
    </button>
  )
}

export function ItemDetailForm({ item, documents, reminders, updateAction, deleteAction }: ItemDetailFormProps) {
  const [updateState, updateFormAction] = useActionState(updateAction, initialState)
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Edit Item</h1>
        <form action={deleteFormAction}>
          <DeleteButton />
        </form>
      </div>

      {deleteState.error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-100 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{deleteState.error}</div>
      )}

      <form action={updateFormAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)]">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            defaultValue={item.name}
            required
            className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-[var(--foreground)]">Quantity</label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              defaultValue={item.quantity}
              required
              step="0.01"
              className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-[var(--foreground)]">Unit</label>
            <input
              type="text"
              name="unit"
              id="unit"
              defaultValue={item.unit ?? ''}
              required
              className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
              placeholder="pcs, kg, l"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)]">Description</label>
          <textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={item.description ?? ''}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
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
          <label htmlFor="expiryDate" className="block text-sm font-medium text-[var(--foreground)]">Expiry Date</label>
          <input
            type="date"
            name="expiryDate"
            id="expiryDate"
            defaultValue={item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : ''}
            className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
          />
        </div>

        {updateState.error && (
          <div className="rounded-md border border-red-300 bg-red-100 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{updateState.error}</div>
        )}

        <div className="pt-4">
          <SaveButton />
        </div>
      </form>
    </div>
  )
}
