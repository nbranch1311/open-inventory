'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type AccountMenuProps = {
  email: string
  signOutAction: () => Promise<void>
}

function getAvatarFallback(email: string) {
  const trimmed = email.trim()
  if (!trimmed) {
    return '?'
  }

  return trimmed[0].toUpperCase()
}

export function AccountMenu({ email, signOutAction }: AccountMenuProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false)
  const desktopMenuContainerRef = useRef<HTMLDivElement | null>(null)

  const avatarFallback = useMemo(() => getAvatarFallback(email), [email])

  useEffect(() => {
    if (!desktopAccountOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node | null
      if (!targetNode) {
        return
      }

      if (desktopMenuContainerRef.current?.contains(targetNode)) {
        return
      }

      setDesktopAccountOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopAccountOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [desktopAccountOpen])

  return (
    <header className="border-b border-(--border) bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="text-base font-semibold">
          OpenInventory
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/add">Add Item</Link>
          </Button>
        </nav>

        <div className="hidden sm:block">
          <div className="relative" ref={desktopMenuContainerRef}>
            <Button
              type="button"
              variant="outline"
              aria-haspopup="menu"
              aria-expanded={desktopAccountOpen}
              aria-label="Open account menu"
              onClick={() => setDesktopAccountOpen((prev) => !prev)}
              className="gap-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--muted) text-sm font-semibold text-foreground">
                {avatarFallback}
              </span>
              <span className="max-w-40 truncate text-sm">{email}</span>
            </Button>

            {desktopAccountOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-(--border) bg-(--card) p-3 shadow-lg">
                <p className="text-xs font-medium uppercase tracking-wide text-(--muted-foreground)">
                  Signed in as
                </p>
                <div className="mt-2 flex items-center gap-3 rounded-md border border-(--border) bg-background p-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--muted) text-sm font-semibold text-foreground">
                    {avatarFallback}
                  </span>
                  <p className="truncate text-sm">{email}</p>
                </div>
                <form action={signOutAction} className="mt-3">
                  <Button type="submit" variant="destructive" className="w-full">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Open mobile navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-(--border) bg-background px-4 py-3 sm:hidden">
          <nav className="mb-4 grid gap-2">
            <Button asChild variant="secondary" className="justify-start">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="secondary" className="justify-start">
              <Link href="/dashboard/add">Add Item</Link>
            </Button>
          </nav>

          <div className="rounded-md border border-(--border) bg-(--card) p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-(--muted-foreground)" />
              Account
            </div>
            <div className="mb-3 flex items-center gap-3 rounded-md border border-(--border) bg-background p-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--muted) text-sm font-semibold text-foreground">
                {avatarFallback}
              </span>
              <p className="truncate text-sm">{email}</p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="destructive" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  )
}
