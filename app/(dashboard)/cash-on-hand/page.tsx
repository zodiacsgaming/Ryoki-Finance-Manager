'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Banknote, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { CashTransaction } from '@/types/database'

const emptyForm = {
  description: '',
  amount: '',
  type: 'in' as 'in' | 'out',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function CashOnHandPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data/cash-on-hand')
      if (res.ok) setTransactions(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const openAdd = (defaultType?: 'in' | 'out') => {
    setEditingId(null)
    setForm({ ...emptyForm, type: defaultType ?? 'in' })
    setModalOpen(true)
  }

  const openEdit = (t: CashTransaction) => {
    setEditingId(t.id)
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      date: t.date,
      notes: t.notes || '',
    })
    setModalOpen(true)
  }

  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialog(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.description) { toast.error('Description is required'); return }
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }

    setSaving(true)
    try {
      const payload = {
        description: form.description.trim(),
        amount,
        type: form.type,
        date: form.date,
        notes: form.notes.trim() || null,
      }
      const url = editingId ? `/api/data/cash-on-hand/${editingId}` : '/api/data/cash-on-hand'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Transaction updated' : 'Transaction added')
      setModalOpen(false)
      fetchTransactions()
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
      const res = await fetch(`/api/data/cash-on-hand/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Transaction deleted')
      setDeleteDialog(false)
      fetchTransactions()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType ? t.type === filterType : true
    return matchSearch && matchType
  }), [transactions, search, filterType])

  const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
  const balance = totalIn - totalOut

  if (loading) return <DashboardLayout title="Cash on Hand"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Cash on Hand">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cash on Hand</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your physical cash flow</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openAdd('out')} className="btn-secondary">
              <ArrowUpRight className="w-4 h-4 text-red-500" /> Cash Out
            </button>
            <button onClick={() => openAdd('in')} className="btn-primary">
              <ArrowDownLeft className="w-4 h-4" /> Cash In
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Current Balance"
            value={formatCurrency(balance)}
            icon={balance >= 0 ? TrendingUp : TrendingDown}
            iconColor={balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
            iconBg={balance >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}
          />
          <StatCard
            title="Total Cash In"
            value={formatCurrency(totalIn)}
            icon={ArrowDownLeft}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-50 dark:bg-green-900/30"
          />
          <StatCard
            title="Total Cash Out"
            value={formatCurrency(totalOut)}
            icon={ArrowUpRight}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 dark:bg-red-900/30"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search transactions..." />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="input-base min-w-[160px]"
          >
            <option value="">All Types</option>
            <option value="in">Cash In</option>
            <option value="out">Cash Out</option>
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No transactions found"
              description={search || filterType ? 'Try adjusting your filters' : 'Add your first cash transaction to start tracking'}
              action={!search && !filterType ? (
                <button onClick={() => openAdd()} className="btn-primary">
                  <Plus className="w-4 h-4" /> Add Transaction
                </button>
              ) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Description</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Type</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Notes</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{t.description}</td>
                      <td className="px-5 py-3.5">
                        {t.type === 'in' ? (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1 w-fit">
                            <ArrowDownLeft className="w-3 h-3" /> Cash In
                          </span>
                        ) : (
                          <span className="badge bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1 w-fit">
                            <ArrowUpRight className="w-3 h-3" /> Cash Out
                          </span>
                        )}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${t.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{formatDate(t.date)}</td>
                      <td className="px-5 py-3.5 text-gray-400 max-w-[160px] truncate">{t.notes || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      Balance ({filtered.length} records)
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(filtered.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'in' }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.type === 'in'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Cash In
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'out' }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.type === 'out'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Cash Out
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description *</label>
            <input
              className="input-base"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={form.type === 'in' ? 'e.g. Salary, Cash from ATM' : 'e.g. Grocery, Transportation'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₱) *</label>
              <input
                className="input-base"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
              <input
                className="input-base"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        loading={deleting}
      />
    </DashboardLayout>
  )
}
