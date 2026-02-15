'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  completeReminder,
  createReminder,
  deleteReminder,
  snoozeReminder,
  updateReminder,
  type ItemReminder,
} from '@/actions/reminders'
import { Button } from '@/components/ui/Button'

type ItemRemindersSectionProps = {
  householdId: string
  itemId: string
  reminders: ItemReminder[]
}

const SNOOZE_OPTIONS = [
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

function formatReminderDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isOverdue = d < now
  const dateStr = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: d.getHours() || d.getMinutes() ? '2-digit' : undefined,
    minute: d.getMinutes() ? '2-digit' : undefined,
  })
  return { dateStr, isOverdue }
}

export function ItemRemindersSection({
  householdId,
  itemId,
  reminders: initialReminders,
}: ItemRemindersSectionProps) {
  const router = useRouter()
  const [reminders, setReminders] = useState(initialReminders)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formDate, setFormDate] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const activeReminders = reminders.filter((r) => !r.is_completed)

  const resetForm = useCallback(() => {
    setFormDate('')
    setFormMessage('')
    setFormError(null)
    setShowForm(false)
    setEditingId(null)
  }, [])

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormError(null)
      if (!formDate.trim()) {
        setFormError('Reminder date is required')
        return
      }

      const reminderDateIso = new Date(formDate).toISOString()

      const result = editingId
        ? await updateReminder(householdId, editingId, {
            reminder_date: reminderDateIso,
            message: formMessage.trim() || null,
          })
        : await createReminder(householdId, itemId, {
            reminder_date: reminderDateIso,
            message: formMessage.trim() || null,
          })

      if (result.error) {
        setFormError(result.error)
        return
      }

      resetForm()
      router.refresh()
    },
    [householdId, itemId, editingId, formDate, formMessage, resetForm, router],
  )

  const handleComplete = useCallback(
    async (reminderId: string) => {
      setLoadingId(reminderId)
      const result = await completeReminder(householdId, reminderId)
      setLoadingId(null)
      if (!result.error && result.data) {
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, is_completed: true } : r)),
        )
        router.refresh()
      }
    },
    [householdId, router],
  )

  const handleSnooze = useCallback(
    async (reminderId: string, hours: number) => {
      setLoadingId(reminderId)
      const until = new Date()
      until.setHours(until.getHours() + hours)
      const result = await snoozeReminder(householdId, reminderId, until.toISOString())
      setLoadingId(null)
      if (!result.error && result.data) {
        setReminders((prev) =>
          prev.map((r) =>
            r.id === reminderId ? { ...r, snoozed_until: result.data!.snoozed_until } : r,
          ),
        )
        router.refresh()
      }
    },
    [householdId, router],
  )

  const handleDelete = useCallback(
    async (reminderId: string) => {
      setLoadingId(reminderId)
      const result = await deleteReminder(householdId, reminderId)
      setLoadingId(null)
      if (!result.error) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId))
        router.refresh()
      }
    },
    [householdId, router],
  )

  const toDatetimeLocal = useCallback((iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }, [])

  const startEdit = useCallback(
    (r: ItemReminder) => {
      setEditingId(r.id)
      setFormDate(toDatetimeLocal(r.reminder_date))
      setFormMessage(r.message ?? '')
      setFormError(null)
      setShowForm(true)
    },
    [toDatetimeLocal],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Reminders</h2>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingId(null)
              setFormDate('')
              setFormMessage('')
              setFormError(null)
              setShowForm(true)
            }}
          >
            <Plus className="mr-1 size-4" aria-hidden />
            Add
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4">
          <div>
            <label htmlFor="reminder-date" className="block text-sm font-medium text-[var(--foreground)]">
              Date & time
            </label>
            <input
              type="datetime-local"
              id="reminder-date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="reminder-message" className="block text-sm font-medium text-[var(--foreground)]">
              Message (optional)
            </label>
            <input
              type="text"
              id="reminder-message"
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="e.g. Check expiry"
              className="mt-1 block min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] sm:text-sm"
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {editingId ? 'Save' : 'Add Reminder'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {activeReminders.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No reminders yet. Add one to get notified about this item.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {activeReminders.map((r) => {
            const { dateStr, isOverdue } = formatReminderDate(r.reminder_date)
            const isLoading = loadingId === r.id
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {r.message || 'Reminder'}
                  </p>
                  <p
                    className={`text-xs ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--muted-foreground)]'}`}
                  >
                    {dateStr}
                    {isOverdue && ' (overdue)'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleComplete(r.id)}
                    disabled={isLoading}
                    aria-label="Mark complete"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                  </Button>
                  <div className="flex">
                    {SNOOZE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.label}
                        variant="link"
                        size="sm"
                        onClick={() => handleSnooze(r.id, opt.hours)}
                        disabled={isLoading}
                        className="text-xs"
                        title={`Snooze ${opt.label}`}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => startEdit(r)}
                    disabled={isLoading}
                    aria-label="Edit reminder"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(r.id)}
                    disabled={isLoading}
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
