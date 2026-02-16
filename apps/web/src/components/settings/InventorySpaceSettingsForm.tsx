'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import {
  deleteCurrentInventorySpace,
  renameCurrentInventorySpace,
  type DeleteInventorySpaceBlockedBy,
} from '@/actions/household'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export type InventorySpaceSettingsData = {
  id: string
  name: string
  createdAt: string
  memberRole: string | null
  isOwner: boolean
}

type InventorySpaceSettingsFormProps = {
  settings: InventorySpaceSettingsData
}

const DELETE_REASON_COPY: Record<keyof DeleteInventorySpaceBlockedBy, string> = {
  inventoryItems: 'Inventory items still exist.',
  itemDocuments: 'Item documents still exist.',
  itemReminders: 'Item reminders still exist.',
}

function formatRole(role: string | null) {
  if (!role) {
    return 'Not available'
  }

  return role[0].toUpperCase() + role.slice(1)
}

function formatCreatedDate(createdAt: string) {
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function InventorySpaceSettingsForm({ settings }: InventorySpaceSettingsFormProps) {
  const router = useRouter()
  const [currentName, setCurrentName] = useState(settings.name)
  const [renameValue, setRenameValue] = useState(settings.name)
  const [renamePending, setRenamePending] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renameSuccess, setRenameSuccess] = useState<string | null>(null)

  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBlockedBy, setDeleteBlockedBy] = useState<DeleteInventorySpaceBlockedBy | null>(null)

  const canDelete =
    settings.isOwner && deleteConfirmationValue.length > 0 && deleteConfirmationValue === currentName

  const blockedReasons = useMemo(() => {
    if (!deleteBlockedBy) {
      return []
    }

    return Object.entries(deleteBlockedBy)
      .filter(([, isBlocked]) => isBlocked)
      .map(([reasonKey]) => DELETE_REASON_COPY[reasonKey as keyof DeleteInventorySpaceBlockedBy])
  }, [deleteBlockedBy])

  const handleRenameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setRenamePending(true)
    setRenameError(null)
    setRenameSuccess(null)

    try {
      const result = await renameCurrentInventorySpace(renameValue)

      if (result.errorCode === 'unauthenticated') {
        router.push('/login')
        return
      }

      if (result.error || !result.data) {
        setRenameError(result.error ?? 'Failed to rename inventory space.')
        return
      }

      setCurrentName(result.data.name)
      setRenameValue(result.data.name)
      setRenameSuccess('Inventory Space name updated.')
      router.refresh()
    } catch {
      setRenameError('Failed to rename inventory space.')
    } finally {
      setRenamePending(false)
    }
  }

  const handleDeleteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setDeletePending(true)
    setDeleteError(null)
    setDeleteBlockedBy(null)

    try {
      const result = await deleteCurrentInventorySpace(deleteConfirmationValue)

      if (result.errorCode === 'unauthenticated') {
        router.push('/login')
        return
      }

      if (!result.success) {
        setDeleteError(result.error ?? 'Failed to delete inventory space.')
        setDeleteBlockedBy(result.blockedBy)
        return
      }

      router.push('/onboarding')
      router.refresh()
    } catch {
      setDeleteError('Failed to delete inventory space.')
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Inventory Space settings</h1>
        <p className="mt-1 text-sm text-(--muted-foreground)">
          Manage the name and deletion safety settings for your current Inventory Space.
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Current settings</CardTitle>
            <CardDescription>Basic information for your active Inventory Space.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-(--border) bg-(--muted) p-3">
                <dt className="text-(--muted-foreground)">Name</dt>
                <dd className="mt-1 font-medium text-foreground">{currentName}</dd>
              </div>
              <div className="rounded-md border border-(--border) bg-(--muted) p-3">
                <dt className="text-(--muted-foreground)">Created</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatCreatedDate(settings.createdAt)}
                </dd>
              </div>
              <div className="rounded-md border border-(--border) bg-(--muted) p-3">
                <dt className="text-(--muted-foreground)">Role</dt>
                <dd className="mt-1 font-medium text-foreground">{formatRole(settings.memberRole)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rename Inventory Space</CardTitle>
            <CardDescription>
              Change the name shown throughout the app. This does not delete any data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!settings.isOwner ? (
              <Alert>Only owners can rename this Inventory Space.</Alert>
            ) : null}

            <form className="space-y-3" onSubmit={handleRenameSubmit}>
              <div className="space-y-2">
                <Label htmlFor="inventory-space-name">Inventory Space name</Label>
                <Input
                  id="inventory-space-name"
                  name="inventorySpaceName"
                  value={renameValue}
                  disabled={!settings.isOwner || renamePending}
                  onChange={(event) => setRenameValue(event.target.value)}
                  placeholder="Inventory Space name"
                  autoComplete="off"
                />
              </div>

              {renameError ? <Alert variant="destructive">{renameError}</Alert> : null}
              {renameSuccess ? (
                <Alert className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {renameSuccess}
                  </span>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full sm:w-auto" disabled={!settings.isOwner || renamePending}>
                {renamePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename Inventory Space'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-red-300 dark:border-red-900">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-(--destructive)" />
              Delete Inventory Space
            </CardTitle>
            <CardDescription>
              This permanently deletes the Inventory Space. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              Deleting this Inventory Space signs you out of this workspace. Delete is blocked while items, item
              documents, or reminders still exist.
            </Alert>

            {!settings.isOwner ? (
              <Alert>Only owners can delete this Inventory Space.</Alert>
            ) : null}

            <form className="space-y-3" onSubmit={handleDeleteSubmit}>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-semibold">{currentName}</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  name="deleteConfirmation"
                  value={deleteConfirmationValue}
                  disabled={!settings.isOwner || deletePending}
                  onChange={(event) => setDeleteConfirmationValue(event.target.value)}
                  placeholder={currentName}
                  autoComplete="off"
                />
                <p className="text-xs text-(--muted-foreground)">The name must match exactly.</p>
              </div>

              {deleteError ? <Alert variant="destructive">{deleteError}</Alert> : null}
              {blockedReasons.length > 0 ? (
                <Alert variant="destructive">
                  <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Delete is blocked until these are cleared:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {blockedReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              ) : null}

              <Button
                type="submit"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!canDelete || deletePending}
              >
                {deletePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Inventory Space'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
