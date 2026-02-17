'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type ImportError = {
  row: number
  message: string
}

export type ImportStockSnapshotResult = {
  success: boolean
  importedRows: number
  createdProducts: number
  createdRooms: number
  createdMovements: number
  errors: ImportError[]
  error: string | null
  errorCode: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'import_failed' | null
}

type ParsedRow = {
  sku: string
  name: string
  room: string
  quantity_on_hand: number
  unit?: string
  barcode?: string
}

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser with quotes support. Good enough for simple imports.
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseStockSnapshotCsv(csvText: string): { rows: ParsedRow[]; errors: ImportError[] } {
  const text = csvText.trim()
  if (!text) {
    return { rows: [], errors: [{ row: 0, message: 'CSV is empty' }] }
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must include a header row and at least one data row' }] }
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const index = (name: string) => headerCells.indexOf(name)

  const idxSku = index('sku')
  const idxName = index('name')
  const idxRoom = index('room')
  const idxQty = index('quantity_on_hand')
  const idxUnit = index('unit')
  const idxBarcode = index('barcode')

  const errors: ImportError[] = []
  if (idxSku === -1 && idxName === -1) {
    errors.push({ row: 0, message: 'Header must include sku and/or name' })
  }
  if (idxRoom === -1) {
    errors.push({ row: 0, message: 'Header must include room' })
  }
  if (idxQty === -1) {
    errors.push({ row: 0, message: 'Header must include quantity_on_hand' })
  }

  if (errors.length > 0) {
    return { rows: [], errors }
  }

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i])
    const rowNumber = i + 1

    const sku = idxSku !== -1 ? (cells[idxSku] ?? '').trim() : ''
    const name = idxName !== -1 ? (cells[idxName] ?? '').trim() : ''
    const room = (cells[idxRoom] ?? '').trim()
    const qtyText = (cells[idxQty] ?? '').trim()

    const quantity = Number(qtyText)
    if (!room) {
      errors.push({ row: rowNumber, message: 'room is required' })
      continue
    }
    if (!sku && !name) {
      errors.push({ row: rowNumber, message: 'sku or name is required' })
      continue
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push({ row: rowNumber, message: 'quantity_on_hand must be a number >= 0' })
      continue
    }

    rows.push({
      sku,
      name,
      room,
      quantity_on_hand: quantity,
      unit: idxUnit !== -1 ? (cells[idxUnit] ?? '').trim() || undefined : undefined,
      barcode: idxBarcode !== -1 ? (cells[idxBarcode] ?? '').trim() || undefined : undefined,
    })
  }

  return { rows, errors }
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

function canImport(role: string | null): boolean {
  return role === 'owner' || role === 'admin'
}

export async function importStockSnapshotCsv(params: {
  householdId: string
  csvText: string
}): Promise<ImportStockSnapshotResult> {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      success: false,
      importedRows: 0,
      createdProducts: 0,
      createdRooms: 0,
      createdMovements: 0,
      errors: [],
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const role = await getUserRoleForHousehold(supabase, userId, params.householdId)
  if (!canImport(role)) {
    return {
      success: false,
      importedRows: 0,
      createdProducts: 0,
      createdRooms: 0,
      createdMovements: 0,
      errors: [],
      error: 'Access denied',
      errorCode: 'forbidden',
    }
  }

  const parsed = parseStockSnapshotCsv(params.csvText)
  if (parsed.errors.length > 0) {
    return {
      success: false,
      importedRows: 0,
      createdProducts: 0,
      createdRooms: 0,
      createdMovements: 0,
      errors: parsed.errors,
      error: 'Invalid CSV input',
      errorCode: 'invalid_input',
    }
  }

  let createdProducts = 0
  let createdRooms = 0
  let createdMovements = 0
  const errors: ImportError[] = []

  const { data: existingRooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('household_id', params.householdId)

  if (roomsError) {
    console.error('Error fetching rooms for import:', roomsError)
  }

  const roomByName = new Map<string, { id: string; name: string }>()
  ;(existingRooms ?? []).forEach((room) => {
    roomByName.set(room.name.toLowerCase(), room)
  })

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const row = parsed.rows[index]
    const rowNumber = index + 2

    // 1) Ensure room exists (create up to existing constraints).
    let roomId = roomByName.get(row.room.toLowerCase())?.id ?? null
    if (!roomId) {
      const { data: created, error: createRoomError } = await supabase
        .from('rooms')
        .insert({ household_id: params.householdId, name: row.room })
        .select('id, name')
        .single()

      if (createRoomError || !created?.id) {
        errors.push({
          row: rowNumber,
          message: `Failed to create room "${row.room}"`,
        })
        continue
      }

      createdRooms += 1
      roomId = created.id
      roomByName.set(created.name.toLowerCase(), created)
    }

    // 2) Ensure product exists (upsert by sku if provided; otherwise create by name).
    let productId: string | null = null
    if (row.sku) {
      const { data: product, error: upsertError } = await supabase
        .from('products')
        .upsert(
          {
            household_id: params.householdId,
            sku: row.sku,
            name: row.name || row.sku,
            unit: row.unit ?? null,
            barcode: row.barcode ?? null,
            is_active: true,
          },
          { onConflict: 'household_id,sku' },
        )
        .select('id')
        .single()

      if (upsertError || !product?.id) {
        errors.push({ row: rowNumber, message: `Failed to upsert product for SKU "${row.sku}"` })
        continue
      }

      // Best-effort counter: we cannot easily tell if it was a new row without an extra query.
      productId = product.id
    } else {
      const { data: product, error: createError } = await supabase
        .from('products')
        .insert({
          household_id: params.householdId,
          name: row.name,
          unit: row.unit ?? null,
          barcode: row.barcode ?? null,
          is_active: true,
        })
        .select('id')
        .single()

      if (createError || !product?.id) {
        errors.push({ row: rowNumber, message: `Failed to create product "${row.name}"` })
        continue
      }

      createdProducts += 1
      productId = product.id
    }

    if (!productId) {
      errors.push({ row: rowNumber, message: 'Failed to resolve product id' })
      continue
    }

    // 3) Compute delta from current stock (room scoped) and insert adjustment movement.
    const { data: stockRows, error: stockError } = await supabase
      .from('stock_on_hand')
      .select('quantity_on_hand')
      .eq('household_id', params.householdId)
      .eq('product_id', productId)
      .eq('room_id', roomId)

    if (stockError) {
      errors.push({ row: rowNumber, message: 'Failed to read current stock_on_hand' })
      continue
    }

    const currentOnHand = Number(stockRows?.[0]?.quantity_on_hand ?? 0)
    const delta = row.quantity_on_hand - currentOnHand
    if (delta === 0) {
      continue
    }

    const { error: movementError } = await supabase.from('inventory_movements').insert({
      household_id: params.householdId,
      product_id: productId,
      room_id: roomId,
      movement_type: 'adjust',
      quantity_delta: delta,
      created_by: userId,
      source_type: 'csv_import',
      source_id: 'stock_snapshot_v1',
      note: 'CSV stock snapshot import',
    })

    if (movementError) {
      errors.push({ row: rowNumber, message: 'Failed to insert stock adjustment movement' })
      continue
    }

    createdMovements += 1
  }

  if (errors.length > 0) {
    return {
      success: false,
      importedRows: parsed.rows.length,
      createdProducts,
      createdRooms,
      createdMovements,
      errors,
      error: 'Import completed with errors',
      errorCode: 'import_failed',
    }
  }

  revalidatePath('/dashboard/business')
  return {
    success: true,
    importedRows: parsed.rows.length,
    createdProducts,
    createdRooms,
    createdMovements,
    errors: [],
    error: null,
    errorCode: null,
  }
}

