import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns'

export function formatDate(dateStr: string | Date | null | undefined, formatPattern = 'MMM dd, yyyy'): string {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return '-'
    return format(d, formatPattern)
  } catch {
    return '-'
  }
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  return formatDate(dateStr, 'MMM dd, yyyy HH:mm')
}

export function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return '-'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '-'
  }
}
