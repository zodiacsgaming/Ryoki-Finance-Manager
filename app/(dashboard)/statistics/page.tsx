'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, EXPENSE_CATEGORY_COLORS, ASSET_CATEGORY_COLORS, exportToCSV } from '@/lib/utils'
import { Download, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { Asset, Saving, EmergencyFund, Expense } from '@/types/database'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const MONTHS = 12

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [emergencyFunds, setEmergencyFunds] = useState<EmergencyFund[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [a, s, ef, ex] = await Promise.all([
        fetch('/api/data/assets').then(r => r.ok ? r.json() : []),
        fetch('/api/data/savings').then(r => r.ok ? r.json() : []),
        fetch('/api/data/emergency-funds').then(r => r.ok ? r.json() : []),
        fetch('/api/data/expenses').then(r => r.ok ? r.json() : []),
      ])
      setAssets(a)
      setSavings(s)
      setEmergencyFunds(ef)
      setExpenses(ex)
    } finally {
      setLoading(false)
    }
  }

  // Filtered expenses
  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const d = new Date(e.date)
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null
    const matchDate = (!from || d >= from) && (!to || d <= to)
    const matchCat = catFilter ? e.category === catFilter : true
    return matchDate && matchCat
  }), [expenses, dateFrom, dateTo, catFilter])

  // Monthly expenses (last N months)
  const now = new Date()
  const monthlyExpenses = Array.from({ length: MONTHS }, (_, i) => {
    const month = subMonths(now, MONTHS - 1 - i)
    const total = expenses
      .filter(e => {
        const d = new Date(e.date)
        return d >= startOfMonth(month) && d <= endOfMonth(month)
      })
      .reduce((s, e) => s + e.amount, 0)
    return { month: format(month, 'MMM yy'), expenses: total }
  })

  // Category breakdown
  const categoryBreakdown = Object.entries(
    filteredExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Asset breakdown
  const assetBreakdown = Object.entries(
    assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + a.value
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Savings progress
  const savingsData = savings.map(s => ({
    name: s.title.length > 16 ? s.title.slice(0, 16) + '…' : s.title,
    current: s.current_amount,
    target: s.target_amount,
  }))

  // Emergency fund progress
  const efData = emergencyFunds.map(f => ({
    name: f.name.length > 16 ? f.name.slice(0, 16) + '…' : f.name,
    current: f.current_amount,
    target: f.target_amount,
  }))

  // Net worth over months (estimated from monthly data)
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const totalSavings = savings.reduce((s, a) => s + a.current_amount, 0)
  const totalEF = emergencyFunds.reduce((s, f) => s + f.current_amount, 0)

  const tooltipStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }
  const tooltipLabelStyle = { color: '#94a3b8' }

  const handleExportExpenses = () => {
    const data = filteredExpenses.map(e => ({
      Title: e.title, Category: e.category, Amount: e.amount,
      Date: e.date, 'Payment Method': e.payment_method, Notes: e.notes || '',
    }))
    exportToCSV(data, `expense-report-${format(new Date(), 'yyyy-MM-dd')}`)
    toast.success('Expense report exported')
  }

  const handleExportAll = () => {
    const allData = [
      ...assets.map(a => ({ Type: 'Asset', Name: a.name, Category: a.category, Amount: a.value, Date: a.date_added, Notes: a.notes || '' })),
      ...savings.map(s => ({ Type: 'Saving', Name: s.title, Category: 'Savings', Amount: s.current_amount, Date: s.date, Notes: s.notes || '' })),
      ...emergencyFunds.map(f => ({ Type: 'Emergency Fund', Name: f.name, Category: 'Emergency', Amount: f.current_amount, Date: f.date, Notes: f.notes || '' })),
      ...expenses.map(e => ({ Type: 'Expense', Name: e.title, Category: e.category, Amount: -e.amount, Date: e.date, Notes: e.notes || '' })),
    ]
    exportToCSV(allData, `finance-report-${format(new Date(), 'yyyy-MM-dd')}`)
    toast.success('Full report exported')
  }

  if (loading) return <DashboardLayout title="Statistics"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="Statistics & Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Statistics & Reports</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visual overview of your finances</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportExpenses} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Expenses CSV
            </button>
            <button onClick={handleExportAll} className="btn-primary text-xs">
              <Download className="w-3.5 h-3.5" /> Full Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-base text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-base text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-base text-sm min-w-[140px]">
              <option value="">All Categories</option>
              {['Food','Transportation','Bills','Shopping','Rent','Others'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {(dateFrom || dateTo || catFilter) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setCatFilter('') }}
              className="btn-secondary text-xs self-end">Clear Filters</button>
          )}
        </div>

        {/* Net Worth Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets', value: totalAssets, color: 'text-blue-600' },
            { label: 'Total Savings', value: totalSavings, color: 'text-green-600' },
            { label: 'Emergency Fund', value: totalEF, color: 'text-purple-600' },
            { label: 'Net Worth', value: totalAssets + totalSavings + totalEF - filteredExpenses.reduce((s, e) => s + e.amount, 0), color: 'text-emerald-600' },
          ].map(item => (
            <div key={item.label} className="card p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color} dark:opacity-90`}>{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>

        {/* Monthly Expenses */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Expenses (Last {MONTHS} Months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Expenses']}
                contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={{ color: '#f87171' }} />
              <Bar dataKey="expenses" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category + Asset breakdown row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expense Category Breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Category Breakdown</h3>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm"><BarChart3 className="w-6 h-6 mr-2" />No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={EXPENSE_CATEGORY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v)]}
                      contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {categoryBreakdown.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: EXPENSE_CATEGORY_COLORS[c.name] || '#6b7280' }} />
                        <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Asset Category Breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Asset Breakdown</h3>
            {assetBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm"><BarChart3 className="w-6 h-6 mr-2" />No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={assetBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {assetBreakdown.map((entry, i) => (
                        <Cell key={i} fill={ASSET_CATEGORY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v)]}
                      contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {assetBreakdown.map(a => (
                    <div key={a.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: ASSET_CATEGORY_COLORS[a.name] || '#6b7280' }} />
                        <span className="text-gray-600 dark:text-gray-400">{a.name}</span>
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(a.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Savings + Emergency Fund Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Savings Progress</h3>
            {savingsData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No savings data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={savingsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v)]} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
                  <Bar dataKey="current" name="Saved" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="target" name="Target" fill="#3b82f620" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Emergency Fund Progress</h3>
            {efData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No emergency fund data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={efData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v)]} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
                  <Bar dataKey="current" name="Funded" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="target" name="Target" fill="#8b5cf620" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
