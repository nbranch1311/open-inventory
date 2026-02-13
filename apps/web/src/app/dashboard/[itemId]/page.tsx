import { getInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/actions/inventory'
import { redirect } from 'next/navigation'
import { ItemDetailForm } from './item-detail-form'

type ItemFormState = {
  error: string | null
}

export default async function ItemDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params
  const { data: item, error } = await getInventoryItem(itemId)

  if (error || !item) {
    return <div>Item not found</div>
  }

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

    const { error } = await updateInventoryItem(itemId, {
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

    const { error } = await deleteInventoryItem(itemId)
    if (error) {
      return { error }
    }

    redirect('/dashboard')
  }

  return (
    <ItemDetailForm item={item} updateAction={updateItem} deleteAction={deleteItem} />
  )
}
