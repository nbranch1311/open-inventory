'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Check, Loader2 } from 'lucide-react'
import {
  completeReminder,
  snoozeReminder,
  type UpcomingReminderWithItem,
} from '@/actions/reminders'
import { Button } from '@/components/ui/Button'

type UpcomingRemindersSectionProps = {
  reminders: UpcomingReminderWithItem[]
  householdId: string
}

const SNOOZE_HOURS = 24

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

export function UpcomingRemindersSection({
  reminders: initialReminders,
  householdId,
}: UpcomingRemindersSectionProps) {
  const router = useRouter()
  const [reminders, setReminders] = React.useState(initialReminders)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const handleComplete = React.useCallback(
    async (reminderId: string) => {
      setLoadingId(reminderId)
      const result = await completeReminder(householdId, reminderId)
      setLoadingId(null)
      if (!result.error) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId))
        router.refresh()
      }
    },
    [householdId, router],
  )

  const handleSnooze = React.useCallback(
    async (reminderId: string) => {
      setLoadingId(reminderId)
      const until = new Date()
      until.setHours(until.getHours() + SNOOZE_HOURS)
      const result = await snoozeReminder(householdId, reminderId, until.toISOString())
      setLoadingId(null)
      if (!result.error) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId))
        router.refresh()
      }
    },
    [householdId, router],
  )

  if (reminders.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Bell className="size-5 text-[var(--muted-foreground)]" aria-hidden />
          Upcoming Reminders
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          No upcoming reminders. Add reminders on item detail pages to stay on top of expirations and
          restocks.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
        <Bell className="size-5 text-[var(--muted-foreground)]" aria-hidden />
        Upcoming Reminders
      </h2>
      <ul className="space-y-2" role="list">
        {reminders.map((r) => {
          const itemName = (r.inventory_items as { name?: string } | null)?.name ?? 'Item'
          const { dateStr, isOverdue } = formatReminderDate(r.reminder_date)
          const isLoading = loadingId === r.id
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/${r.item_id}?household=${householdId}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  {itemName}
                </Link>
                <p className="text-sm text-[var(--muted-foreground)]">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSnooze(r.id)}
                  disabled={isLoading}
                >
                  Snooze 1 day
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
