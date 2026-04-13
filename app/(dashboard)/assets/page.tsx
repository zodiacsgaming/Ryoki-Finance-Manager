'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, ASSET_CATEGORIES, ASSET_CATEGORY_COLORS } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Wallet, Filter } from 'lucide-react'
import type { Asset, AssetCategory } from '@/types/database'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const emptyForm = {
  name: '',
  category: 'Cash' as AssetCategory,
  value: '',
  date_added: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAssets() }, [])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/data/assets')
      if (res.ok) setAssets(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id)
    setForm({
      name: asset.name,
      category: asset.category,
      value: String(asset.value),
      date_added: asset.date_added,
      notes: asset.notes || '',
    })
    setModalOpen(true)
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
    setDeleteDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.value) { toast.error('Name and value are required'); return }
    const val = parseFloat(form.value)
    if (isNaN(val) || val < 0) { toast.error('Enter a valid value'); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        value: val,
        date_added: form.date_added,
        notes: form.notes.trim() || null,
      }

      const url = editingId ? `/api/data/assets/${editingId}` : '/api/data/assets'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Asset updated' : 'Asset added')
      setModalOpen(false)
      fetchAssets()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save asset')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/data/assets/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Asset deleted')
      setDeleteDialog(false)
      fetchAssets()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(() => assets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory ? a.category === filterCategory : true
    return matchSearch && matchCat
  }), [assets, search, filterCategory])

  const totalValue = assets.reduce((s, a) => s + a.value, 0)

  const categoryData = Object.entries(
    assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + a.value
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  if (loading) return <DashboardLayout title="Assets"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Assets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assets</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track everything you own</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        {/* Stat + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Asset Value"
            value={formatCurrency(totalValue)}
            subtitle={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
            icon={Wallet}
            className="lg:col-span-1"
          />
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">By Category</h3>
            {categoryData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={ASSET_CATEGORY_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v)]}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search assets..." /></div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="input-base pl-9 pr-8 min-w-[160px]"
            >
              <option value="">All Categories</option>
              {ASSET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Wallet} title="No assets found"
              description={search || filterCategory ? 'Try adjusting your filters' : 'Add your first asset to start tracking'}
              action={!search && !filterCategory ? (
                <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Asset</button>
              ) : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Asset</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Value</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Date Added</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Notes</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(asset => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{asset.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge" style={{
                          background: (ASSET_CATEGORY_COLORS[asset.category] || '#6b7280') + '20',
                          color: ASSET_CATEGORY_COLORS[asset.category] || '#6b7280',
                        }}>{asset.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(asset.value)}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{formatDate(asset.date_added)}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{asset.notes || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(asset)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDelete(asset.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200">Total ({filtered.length})</td>
                    <td className="px-5 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(filtered.reduce((s, a) => s + a.value, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Asset' : 'Add Asset'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asset Name *</label>
            <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BDO Savings Account" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
              <select className="input-base" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as AssetCategory }))}>
                {ASSET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value (₱) *</label>
              <input className="input-base" type="number" min="0" step="0.01" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Added</label>
            <input className="input-base" type="date" value={form.date_added}
              onChange={e => setForm(f => ({ ...f, date_added: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea className="input-base resize-none" rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Asset" message="Are you sure you want to delete this asset? This cannot be undone." loading={deleting} />
    </DashboardLayout>
  )
}
