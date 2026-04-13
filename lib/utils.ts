import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateInput(dateStr: string): string {
  // Returns YYYY-MM-DD format for input[type=date]
  return dateStr.split('T')[0]
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-blue-500'
  if (percentage >= 50) return 'bg-yellow-500'
  return 'bg-red-400'
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header]
          const str = value === null || value === undefined ? '' : String(value)
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const ASSET_CATEGORIES = [
  'Cash',
  'Investments',
  'Property',
  'Vehicle',
  'Gadgets',
  'Other',
] as const

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Bills',
  'Shopping',
  'Rent',
  'Others',
] as const

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'E-Wallet',
  'Other',
] as const

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transportation: '#3b82f6',
  Bills: '#8b5cf6',
  Shopping: '#ec4899',
  Rent: '#14b8a6',
  Others: '#6b7280',
}

export const ASSET_CATEGORY_COLORS: Record<string, string> = {
  Cash: '#22c55e',
  Investments: '#3b82f6',
  Property: '#f59e0b',
  Vehicle: '#8b5cf6',
  Gadgets: '#ec4899',
  Other: '#6b7280',
}
