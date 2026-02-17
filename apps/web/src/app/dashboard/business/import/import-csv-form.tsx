'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { importStockSnapshotCsv } from '@/actions/csv-import'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

type Props = {
  householdId: string
}

const DEFAULT_TEMPLATE = `sku,name,room,quantity_on_hand,unit,barcode
SKU-001,Example Product,Backroom,25,pcs,
SKU-002,Example Product 2,Sales Floor,3,pcs,
`

export function ImportCsvForm({ householdId }: Props) {
  const [csvText, setCsvText] = useState(DEFAULT_TEMPLATE)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setError(null)
    setSuccess(null)

    try {
      const text = await file.text()
      setCsvText(text)
    } catch {
      setError('Failed to read file.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await importStockSnapshotCsv({ householdId, csvText })
      if (!result.success) {
        const details =
          result.errors.length > 0
            ? ` (${result.errors.slice(0, 3).map((e) => `row ${e.row}: ${e.message}`).join('; ')})`
            : ''
        setError((result.error ?? 'Import failed') + details)
        return
      }

      setSuccess(
        `Imported ${result.importedRows} rows. Created ${result.createdMovements} movements, ${result.createdRooms} rooms.`,
      )
    } catch {
      setError('Import failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Import CSV</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/business?space=${householdId}`}>Back</Link>
        </Button>
      </div>

      <Alert>
        CSV format: `sku,name,room,quantity_on_hand,unit,barcode`. Import sets stock levels by inserting ledger adjustment
        movements per product + room.
      </Alert>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--muted-foreground)" htmlFor="csv-file">
            CSV file (optional)
          </label>
          <input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--muted-foreground)" htmlFor="csv-text">
            CSV text
          </label>
          <Textarea
            id="csv-text"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={12}
          />
        </div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {success ? <Alert>{success}</Alert> : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Importing...' : 'Import stock snapshot'}
        </Button>
      </form>
    </div>
  )
}

