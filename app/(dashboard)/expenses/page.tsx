'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, PAYMENT_METHODS, EXPENSE_CATEGORY_COLORS, exportToCSV } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, CreditCard, Filter, Download, Calendar } from 'lucide-react'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types/database'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'

const emptyForm = {
  title: '',
  amount: '',
  category: 'Food' as ExpenseCategory,
  date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash' as PaymentMethod,
  notes: '',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchExpenses() }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data/expenses')
      if (res.ok) setExpenses(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (exp: Expense) => {
    setEditingId(exp.id)
    setForm({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date,
      payment_method: exp.payment_method,
      notes: exp.notes || '',
    })
    setModalOpen(true)
  }

  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialog(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.title) { toast.error('Title is required'); return }
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        amount,
        category: form.category,
        date: form.date,
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
      }
      const url = editingId ? `/api/data/expenses/${editingId}` : '/api/data/expenses'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Expense updated' : 'Expense added')
      setModalOpen(false)
      fetchExpenses()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/data/expenses/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Expense deleted')
      setDeleteDialog(false)
      fetchExpenses()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const monthOptions = useMemo(() => {
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
    }
    return months
  }, [])

  const filtered = useMemo(() => expenses.filter(exp => {
    const matchSearch = exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory ? exp.category === filterCategory : true
    const matchMonth = filterMonth ? exp.date.startsWith(filterMonth) : true
    return matchSearch && matchCat && matchMonth
  }), [expenses, search, filterCategory, filterMonth])

  const now = new Date()
  const thisMonthTotal = expenses
    .filter(e => new Date(e.date) >= startOfMonth(now) && new Date(e.date) <= endOfMonth(now))
    .reduce((s, e) => s + e.amount, 0)
  const lastMonthTotal = expenses
    .filter(e => {
      const lm = subMonths(now, 1)
      return new Date(e.date) >= startOfMonth(lm) && new Date(e.date) <= endOfMonth(lm)
    })
    .reduce((s, e) => s + e.amount, 0)

  const handleExportCSV = () => {
    const data = filtered.map(e => ({
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      Date: e.date,
      'Payment Method': e.payment_method,
      Notes: e.notes || '',
    }))
    exportToCSV(data, `expenses-${format(new Date(), 'yyyy-MM-dd')}`)
    toast.success('Exported to CSV')
  }

  if (loading) return <DashboardLayout title="Expenses"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Expenses">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your spending</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="btn-secondary" title="Export CSV">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="This Month" value={formatCurrency(thisMonthTotal)} icon={CreditCard}
            iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-50 dark:bg-red-900/30" />
          <StatCard title="Last Month" value={formatCurrency(lastMonthTotal)} icon={Calendar}
            iconColor="text-orange-600 dark:text-orange-400" iconBg="bg-orange-50 dark:bg-orange-900/30" />
          <StatCard title="Total Records" value={`${expenses.length} expenses`} icon={Filter}
            iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-50 dark:bg-blue-900/30" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search expenses..." /></div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-base pl-9 min-w-[160px]">
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input-base pl-9 min-w-[160px]">
              <option value="">All Months</option>
              {monthOptions.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={CreditCard} title="No expenses found"
              description={search || filterCategory || filterMonth ? 'Try adjusting your filters' : 'Add your first expense to start tracking'}
              action={!search && !filterCategory && !filterMonth ? (
                <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Expense</button>
              ) : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Expense</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Payment</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Notes</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{exp.title}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge" style={{
                          background: (EXPENSE_CATEGORY_COLORS[exp.category] || '#6b7280') + '20',
                          color: EXPENSE_CATEGORY_COLORS[exp.category] || '#6b7280',
                        }}>{exp.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{formatDate(exp.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">{exp.payment_method}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 max-w-[160px] truncate">{exp.notes || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => openDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200">Total ({filtered.length})</td>
                    <td className="px-5 py-3 text-right font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
            <input className="input-base" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Grocery shopping" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₱) *</label>
              <input className="input-base" type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
              <select className="input-base" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input className="input-base" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
              <select className="input-base" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea className="input-base resize-none" rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Expense" message="Are you sure you want to delete this expense?" loading={deleting} />
    </DashboardLayout>
  )
}
