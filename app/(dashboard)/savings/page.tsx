'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import ProgressBar from '@/components/ui/ProgressBar'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, PiggyBank, Target, CheckCircle2, PlusCircle, ArrowLeftRight } from 'lucide-react'
import type { Saving } from '@/types/database'

const emptyForm = {
  title: '',
  target_amount: '',
  current_amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

const emptyDeposit = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function SavingsPage() {
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSavingState] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [depositing, setDepositing] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [depositModal, setDepositModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [depositingItem, setDepositingItem] = useState<Saving | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [depositForm, setDepositForm] = useState(emptyDeposit)
  const [transferModal, setTransferModal] = useState(false)
  const [transferringItem, setTransferringItem] = useState<Saving | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [transferForm, setTransferForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchSavings() }, [])

  const fetchSavings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data/savings')
      if (res.ok) setSavings(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (s: Saving) => {
    setEditingId(s.id)
    setForm({ title: s.title, target_amount: String(s.target_amount), current_amount: String(s.current_amount), date: s.date, notes: s.notes || '' })
    setModalOpen(true)
  }

  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialog(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(form.target_amount)
    const current = parseFloat(form.current_amount)
    if (!form.title) { toast.error('Title is required'); return }
    if (isNaN(target) || target <= 0) { toast.error('Enter a valid target amount'); return }
    if (isNaN(current) || current < 0) { toast.error('Enter a valid current amount'); return }
    if (current > target) { toast.error('Current amount cannot exceed target'); return }

    setSavingState(true)
    try {
      const payload = { title: form.title.trim(), target_amount: target, current_amount: current, date: form.date, notes: form.notes.trim() || null }
      const url = editingId ? `/api/data/savings/${editingId}` : '/api/data/savings'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Savings goal updated' : 'Savings goal added')
      setModalOpen(false)
      fetchSavings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingState(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/data/savings/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Savings goal deleted')
      setDeleteDialog(false)
      fetchSavings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const openDeposit = (s: Saving) => {
    setDepositingItem(s)
    setDepositForm(emptyDeposit)
    setDepositModal(true)
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depositingItem) return
    const amount = parseFloat(depositForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }

    setDepositing(true)
    try {
      const newAmount = depositingItem.current_amount + amount
      const res = await fetch(`/api/data/savings/${depositingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: newAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Added ${formatCurrency(amount)} on ${depositForm.date}`)
      setDepositModal(false)
      fetchSavings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add money')
    } finally {
      setDepositing(false)
    }
  }

  const openTransfer = (s: Saving) => {
    setTransferringItem(s)
    setTransferForm({ amount: '', date: new Date().toISOString().split('T')[0] })
    setTransferModal(true)
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferringItem) return
    const amount = parseFloat(transferForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (amount > transferringItem.current_amount) { toast.error('Amount exceeds available savings balance'); return }

    setTransferring(true)
    try {
      const newAmount = transferringItem.current_amount - amount
      const [savRes, cashRes] = await Promise.all([
        fetch(`/api/data/savings/${transferringItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_amount: newAmount }),
        }),
        fetch('/api/data/cash-on-hand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `Transfer from savings: ${transferringItem.title}`,
            amount,
            type: 'in',
            date: transferForm.date,
            notes: null,
          }),
        }),
      ])
      if (!savRes.ok) { const d = await savRes.json(); throw new Error(d.error) }
      if (!cashRes.ok) { const d = await cashRes.json(); throw new Error(d.error) }
      toast.success(`Transferred ${formatCurrency(amount)} to Cash on Hand`)
      setTransferModal(false)
      fetchSavings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  const filtered = useMemo(() => savings.filter(s => s.title.toLowerCase().includes(search.toLowerCase())), [savings, search])

  const totalSaved = savings.reduce((s, a) => s + a.current_amount, 0)
  const totalTarget = savings.reduce((s, a) => s + a.target_amount, 0)
  const completed = savings.filter(s => s.current_amount >= s.target_amount).length

  if (loading) return <DashboardLayout title="Savings"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Savings">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Savings Goals</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your saving progress</p>
          </div>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Goal</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Saved" value={formatCurrency(totalSaved)} icon={PiggyBank}
            iconColor="text-green-600 dark:text-green-400" iconBg="bg-green-50 dark:bg-green-900/30" />
          <StatCard title="Total Target" value={formatCurrency(totalTarget)} icon={Target}
            iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-50 dark:bg-blue-900/30" />
          <StatCard title="Goals Completed" value={`${completed} / ${savings.length}`} icon={CheckCircle2}
            iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-50 dark:bg-purple-900/30" />
        </div>

        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search savings goals..." />
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={PiggyBank} title="No savings goals found"
              description={search ? 'Try a different search term' : 'Add your first savings goal to start tracking'}
              action={!search ? <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Goal</button> : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(s => {
              const pct = s.target_amount > 0 ? Math.min((s.current_amount / s.target_amount) * 100, 100) : 0
              const done = s.current_amount >= s.target_amount
              return (
                <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.date)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {done && <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Done</span>}
                      <button onClick={() => openDeposit(s)} title="Add Money" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors"><PlusCircle className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openTransfer(s)} title="Transfer to Cash on Hand" className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-600 transition-colors"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Saved</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(s.current_amount)}</span>
                  </div>
                  <ProgressBar current={s.current_amount} target={s.target_amount} />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>Target: {formatCurrency(s.target_amount)}</span>
                    <span className="font-medium" style={{ color: pct >= 100 ? '#22c55e' : pct >= 75 ? '#3b82f6' : pct >= 50 ? '#eab308' : '#f87171' }}>{pct.toFixed(1)}%</span>
                  </div>
                  {s.notes && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 truncate">{s.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Savings Goal' : 'Add Savings Goal'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
            <input className="input-base" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Emergency Travel Fund" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Amount (₱) *</label>
              <input className="input-base" type="number" min="0.01" step="0.01" value={form.target_amount}
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Amount (₱) *</label>
              <input className="input-base" type="number" min="0" step="0.01" value={form.current_amount}
                onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} placeholder="0.00" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
            <input className="input-base" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea className="input-base resize-none" rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add Goal'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Savings Goal" message="Are you sure you want to delete this savings goal?" loading={deleting} />

      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="Transfer to Cash on Hand">
        {transferringItem && (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">From Savings Goal</p>
              <p className="font-semibold text-gray-900 dark:text-white">{transferringItem.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Available: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(transferringItem.current_amount)}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount to Transfer (₱) *</label>
              <input className="input-base" type="number" min="0.01" step="0.01" max={transferringItem.current_amount}
                value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" required autoFocus />
              {transferForm.amount && !isNaN(parseFloat(transferForm.amount)) && parseFloat(transferForm.amount) > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Savings remaining: {formatCurrency(transferringItem.current_amount - parseFloat(transferForm.amount))}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
              <input className="input-base" type="date" value={transferForm.date}
                onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={transferring}>
                <ArrowLeftRight className="w-4 h-4" />
                {transferring ? 'Transferring...' : 'Transfer to Cash'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={depositModal} onClose={() => setDepositModal(false)} title="Add Money">
        {depositingItem && (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Savings Goal</p>
              <p className="font-semibold text-gray-900 dark:text-white">{depositingItem.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Current: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(depositingItem.current_amount)}</span>
                {' / '}Target: <span className="font-medium">{formatCurrency(depositingItem.target_amount)}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount to Add (₱) *</label>
              <input className="input-base" type="number" min="0.01" step="0.01"
                value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" required autoFocus />
              {depositForm.amount && !isNaN(parseFloat(depositForm.amount)) && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  New balance: {formatCurrency(depositingItem.current_amount + parseFloat(depositForm.amount))}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Received *</label>
              <input className="input-base" type="date" value={depositForm.date}
                onChange={e => setDepositForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDepositModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={depositing}>
                <PlusCircle className="w-4 h-4" />
                {depositing ? 'Adding...' : 'Add Money'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  )
}
