import { cn } from '@/lib/utils'

export function SiteChip({
  children,
  tone = 'muted',
  className,
}: {
  children: React.ReactNode
  tone?: 'muted' | 'accent' | 'solid'
  className?: string
}) {
  const tonos = {
    muted: 'bg-site-surface-container text-site-secondary',
    accent: 'bg-site-primary/5 text-site-primary/60',
    solid: 'bg-site-primary-container text-site-on-primary',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-site px-2 py-1 text-site-label uppercase',
        tonos[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
