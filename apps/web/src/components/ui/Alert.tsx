import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/Cn'

const alertVariants = cva('w-full rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      default:
        'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]',
      destructive:
        'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

type AlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
