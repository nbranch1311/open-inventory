import { getUserHouseholds } from '@/actions/household'
import { getInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/actions/inventory'
import { getItemDocuments } from '@/actions/ItemDocuments'
import { getItemReminders } from '@/actions/reminders'
import { redirect } from 'next/navigation'
import { ItemDetailForm } from './item-detail-form'

type ItemFormState = {
  error: string | null
}

type PageProps = {
  params: Promise<{ itemId: string }>
  searchParams: Promise<{ household?: string }>
}

export default async function ItemDetailPage({ params, searchParams }: PageProps) {
  const { itemId } = await params
  const { household: householdFromUrl } = await searchParams
  const households = await getUserHouseholds()
  const householdId = householdFromUrl ?? households?.[0]?.id

  if (!householdFromUrl && !households) {
    redirect('/login')
  }

  if (!householdId) {
    redirect('/onboarding')
  }

  const [itemResult, docsResult, remindersResult] = await Promise.all([
    getInventoryItem(itemId, householdId),
    getItemDocuments(householdId, itemId),
    getItemReminders(householdId, itemId),
  ])

  const { data: item, error } = itemResult
  const documents = docsResult.error ? [] : (docsResult.data ?? [])
  const reminders = remindersResult.error ? [] : (remindersResult.data ?? [])

  if (error || !item) {
    return <div>Item not found</div>
  }
  const itemRecord = item

  async function updateItem(previousState: ItemFormState, formData: FormData): Promise<ItemFormState> {
    'use server'
    void previousState

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    const quantity = Number(formData.get('quantity'))
    const unit = (formData.get('unit') as string | null)?.trim() ?? ''
    const description = formData.get('description') as string
    const expiryDate = formData.get('expiryDate') as string

    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) {
      return { error: 'Name, quantity, and unit are required.' }
    }

    const { error } = await updateInventoryItem(itemRecord.household_id, itemId, {
      name,
      quantity,
      unit,
      description,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
    })

    if (error) {
      return { error }
    }

    redirect('/dashboard')
  }

  async function deleteItem(previousState: ItemFormState, formData: FormData): Promise<ItemFormState> {
    'use server'
    void previousState
    void formData

    const { error } = await deleteInventoryItem(itemRecord.household_id, itemId)
    if (error) {
      return { error }
    }

    redirect('/dashboard')
  }

  return (
    <ItemDetailForm
      item={itemRecord}
      documents={documents ?? []}
      reminders={reminders}
      updateAction={updateItem}
      deleteAction={deleteItem}
    />
  )
}
