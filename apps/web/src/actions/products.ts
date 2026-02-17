'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export type Product = Database['public']['Tables']['products']['Row']

type ProductResult = {
  data: Product | null
  error: string | null
  errorCode: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'create_failed' | 'update_failed' | null
}

type StockOnHandRow = Database['public']['Views']['stock_on_hand']['Row']

export type ProductWithStock = Product & {
  stockOnHand: number
}

async function getUserRoleForHousehold(
  supabase: Awaited<ReturnType<typeof getServerAuthContext>>['supabase'],
  userId: string,
  householdId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (error || !data?.[0]) {
    return null
  }

  return data[0].role
}

function canManageProducts(role: string | null): boolean {
  return role === 'owner' || role === 'admin'
}

export async function getProductsForHousehold(householdId: string): Promise<ProductWithStock[]> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return []
  }

  // RLS protects reads; this keeps return stable on errors.
  const [productsResult, stockResult] = await Promise.all([
    supabase.from('products').select('*').eq('household_id', householdId).order('name', { ascending: true }),
    supabase.from('stock_on_hand').select('*').eq('household_id', householdId),
  ])

  if (productsResult.error) {
    console.error('Error fetching products:', productsResult.error)
    return []
  }

  const stockRows = (stockResult.error ? [] : (stockResult.data ?? [])) as StockOnHandRow[]
  const stockByProductId = new Map<string, number>()
  stockRows.forEach((row) => {
    if (!row.product_id) return
    const previous = stockByProductId.get(row.product_id) ?? 0
    stockByProductId.set(row.product_id, previous + Number(row.quantity_on_hand ?? 0))
  })

  return (productsResult.data ?? []).map((product) => ({
    ...product,
    stockOnHand: stockByProductId.get(product.id) ?? 0,
  }))
}

export async function createProduct(
  householdId: string,
  input: { name: string; sku?: string; barcode?: string; unit?: string },
): Promise<ProductResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!canManageProducts(role)) {
    return { data: null, error: 'Access denied', errorCode: 'forbidden' }
  }

  const name = input.name.trim()
  if (!name) {
    return { data: null, error: 'Product name is required', errorCode: 'invalid_input' }
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      household_id: householdId,
      name,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      unit: input.unit?.trim() || null,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('Error creating product:', error)
    return { data: null, error: 'Failed to create product', errorCode: 'create_failed' }
  }

  revalidatePath('/dashboard/business')
  return { data, error: null, errorCode: null }
}

export async function setProductActive(
  householdId: string,
  productId: string,
  isActive: boolean,
): Promise<ProductResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return { data: null, error: 'User not authenticated', errorCode: 'unauthenticated' }
  }

  const role = await getUserRoleForHousehold(supabase, userId, householdId)
  if (!canManageProducts(role)) {
    return { data: null, error: 'Access denied', errorCode: 'forbidden' }
  }

  const { data, error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('household_id', householdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('Error updating product:', error)
    return { data: null, error: 'Failed to update product', errorCode: 'update_failed' }
  }

  revalidatePath('/dashboard/business')
  return { data, error: null, errorCode: null }
}

