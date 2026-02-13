'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

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
}

type ItemDetailFormProps = {
  item: ItemDetail
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
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 disabled:opacity-70 transition-colors"
    >
      {pending ? 'Deleting...' : 'Delete Item'}
    </button>
  )
}

export function ItemDetailForm({ item, updateAction, deleteAction }: ItemDetailFormProps) {
  const [updateState, updateFormAction] = useActionState(updateAction, initialState)
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState)

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Item</h1>
        <form action={deleteFormAction}>
          <DeleteButton />
        </form>
      </div>

      {deleteState.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{deleteState.error}</div>
      )}

      <form action={updateFormAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            defaultValue={item.name}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              defaultValue={item.quantity}
              required
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
            <input
              type="text"
              name="unit"
              id="unit"
              defaultValue={item.unit ?? ''}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="pcs, kg, l"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={item.description ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          />
        </div>

        <div>
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Expiry Date</label>
          <input
            type="date"
            name="expiryDate"
            id="expiryDate"
            defaultValue={item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          />
        </div>

        {updateState.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{updateState.error}</div>
        )}

        <div className="pt-4">
          <SaveButton />
        </div>
      </form>
    </div>
  )
}
