import { getUserHouseholds } from '@/actions/household'
import { createInventoryItem } from '@/actions/inventory'
import { redirect } from 'next/navigation'
import { AddItemForm } from './add-item-form'

type AddItemFormState = {
  error: string | null
}

export default async function AddItemPage() {
  const households = await getUserHouseholds()

  if (!households || households.length === 0) {
    redirect('/onboarding')
  }

  const householdId = households[0].id

  async function addItem(_: AddItemFormState, formData: FormData): Promise<AddItemFormState> {
    'use server'

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    const quantity = Number(formData.get('quantity'))
    const unit = (formData.get('unit') as string | null)?.trim() ?? ''
    const description = formData.get('description') as string
    const expiryDate = formData.get('expiryDate') as string

    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) {
      return { error: 'Name, quantity, and unit are required.' }
    }

    const { error } = await createInventoryItem(householdId, {
      name,
      quantity,
      unit,
      description,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      household_id: householdId
    })

    if (error) {
      return { error }
    }

    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Add New Item</h1>
      <AddItemForm action={addItem} />
    </div>
  )
}
