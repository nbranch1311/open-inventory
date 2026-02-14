'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

type AddItemFormState = {
  error: string | null
}

type AddItemFormProps = {
  action: (state: AddItemFormState, formData: FormData) => Promise<AddItemFormState>
}

const initialState: AddItemFormState = {
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full justify-center rounded-md border border-transparent bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:brightness-110 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
    >
      {pending ? 'Saving...' : 'Add Item'}
    </button>
  )
}

export function AddItemForm({ action }: AddItemFormProps) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          type="text"
          name="name"
          id="name"
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
          className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="expiryDate" className="block text-sm font-medium text-[var(--foreground)]">Expiry Date</label>
        <input
          type="date"
          name="expiryDate"
          id="expiryDate"
          className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm"
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-red-300 bg-red-100 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{state.error}</div>
      )}

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  )
}
