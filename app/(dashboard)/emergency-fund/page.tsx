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
import { Plus, Pencil, Trash2, Shield, Target, CheckCircle2, PlusCircle } from 'lucide-react'
import type { EmergencyFund } from '@/types/database'

const emptyForm = {
  name: '',
  target_amount: '',
  current_amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

const emptyDeposit = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
}

export default function EmergencyFundPage() {
  const [funds, setFunds] = useState<EmergencyFund[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [depositing, setDepositing] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [depositModal, setDepositModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [depositingItem, setDepositingItem] = useState<EmergencyFund | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [depositForm, setDepositForm] = useState(emptyDeposit)

  useEffect(() => { fetchFunds() }, [])

  const fetchFunds = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data/emergency-funds')
      if (res.ok) setFunds(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (f: EmergencyFund) => {
    setEditingId(f.id)
    setForm({ name: f.name, target_amount: String(f.target_amount), current_amount: String(f.current_amount), date: f.date, notes: f.notes || '' })
    setModalOpen(true)
  }

  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialog(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(form.target_amount)
    const current = parseFloat(form.current_amount)
    if (!form.name) { toast.error('Name is required'); return }
    if (isNaN(target) || target <= 0) { toast.error('Enter a valid target amount'); return }
    if (isNaN(current) || current < 0) { toast.error('Enter a valid current amount'); return }

    setSaving(true)
    try {
      const payload = { name: form.name.trim(), target_amount: target, current_amount: current, date: form.date, notes: form.notes.trim() || null }
      const url = editingId ? `/api/data/emergency-funds/${editingId}` : '/api/data/emergency-funds'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Emergency fund updated' : 'Emergency fund added')
      setModalOpen(false)
      fetchFunds()
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
      const res = await fetch(`/api/data/emergency-funds/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Emergency fund deleted')
      setDeleteDialog(false)
      fetchFunds()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const openDeposit = (fund: EmergencyFund) => {
    setDepositingItem(fund)
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
      const res = await fetch(`/api/data/emergency-funds/${depositingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: newAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Added ${formatCurrency(amount)} on ${depositForm.date}`)
      setDepositModal(false)
      fetchFunds()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add money')
    } finally {
      setDepositing(false)
    }
  }

  const filtered = useMemo(() => funds.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), [funds, search])

  const totalFunded = funds.reduce((s, f) => s + f.current_amount, 0)
  const totalTarget = funds.reduce((s, f) => s + f.target_amount, 0)
  const completed = funds.filter(f => f.current_amount >= f.target_amount).length

  if (loading) return <DashboardLayout title="Emergency Fund"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Emergency Fund">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Emergency Fund</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Build your financial safety net</p>
          </div>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Fund</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Funded" value={formatCurrency(totalFunded)} icon={Shield}
            iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-50 dark:bg-purple-900/30" />
          <StatCard title="Total Target" value={formatCurrency(totalTarget)} icon={Target}
            iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-50 dark:bg-blue-900/30" />
          <StatCard title="Funds Completed" value={`${completed} / ${funds.length}`} icon={CheckCircle2}
            iconColor="text-green-600 dark:text-green-400" iconBg="bg-green-50 dark:bg-green-900/30" />
        </div>

        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search emergency funds..." />
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={Shield} title="No emergency funds found"
              description={search ? 'Try a different search term' : 'Start building your financial safety net'}
              action={!search ? <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Fund</button> : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(fund => {
              const pct = fund.target_amount > 0 ? Math.min((fund.current_amount / fund.target_amount) * 100, 100) : 0
              const done = fund.current_amount >= fund.target_amount
              const remaining = Math.max(fund.target_amount - fund.current_amount, 0)
              return (
                <div key={fund.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{fund.name}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(fund.date)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {done && <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Complete</span>}
                      <button onClick={() => openDeposit(fund)} title="Add Money" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors"><PlusCircle className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEdit(fund)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openDelete(fund.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Funded</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(fund.current_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Target</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(fund.target_amount)}</p>
                    </div>
                  </div>

                  <ProgressBar current={fund.current_amount} target={fund.target_amount} />

                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-gray-400">{done ? 'Goal reached! 🎉' : `₱${remaining.toLocaleString()} remaining`}</span>
                    <span className="font-semibold" style={{ color: pct >= 100 ? '#22c55e' : pct >= 75 ? '#3b82f6' : pct >= 50 ? '#eab308' : '#f87171' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {fund.notes && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 truncate">{fund.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Emergency Fund' : 'Add Emergency Fund'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fund Name *</label>
            <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 3-Month Emergency Fund" required />
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
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add Fund'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Emergency Fund" message="Are you sure you want to delete this emergency fund?" loading={deleting} />

      <Modal isOpen={depositModal} onClose={() => setDepositModal(false)} title="Add Money">
        {depositingItem && (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Emergency Fund</p>
              <p className="font-semibold text-gray-900 dark:text-white">{depositingItem.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Funded: <span className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(depositingItem.current_amount)}</span>
                {' / '}Target: <span className="font-medium">{formatCurrency(depositingItem.target_amount)}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount to Add (₱) *</label>
              <input className="input-base" type="number" min="0.01" step="0.01"
                value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" required autoFocus />
              {depositForm.amount && !isNaN(parseFloat(depositForm.amount)) && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
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
