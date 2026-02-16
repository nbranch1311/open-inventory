import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/Cn'

type SelectProps = React.ComponentProps<'select'> & {
  wrapperClassName?: string
}

function Select({ className, wrapperClassName, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(
          'flex h-11 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
    </div>
  )
}

export { Select }
