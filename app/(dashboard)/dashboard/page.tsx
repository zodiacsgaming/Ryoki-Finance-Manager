'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, EXPENSE_CATEGORY_COLORS } from '@/lib/utils'
import {
  Wallet,
  PiggyBank,
  Shield,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Asset, Saving, EmergencyFund, Expense, CashTransaction } from '@/types/database'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [emergencyFunds, setEmergencyFunds] = useState<EmergencyFund[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [a, s, ef, ex, cash] = await Promise.all([
        fetch('/api/data/assets').then(r => r.ok ? r.json() : []),
        fetch('/api/data/savings').then(r => r.ok ? r.json() : []),
        fetch('/api/data/emergency-funds').then(r => r.ok ? r.json() : []),
        fetch('/api/data/expenses').then(r => r.ok ? r.json() : []),
        fetch('/api/data/cash-on-hand').then(r => r.ok ? r.json() : []),
      ])
      setAssets(a)
      setSavings(s)
      setEmergencyFunds(ef)
      setExpenses(ex)
      setCashTransactions(cash)
    } finally {
      setLoading(false)
    }
  }

  // Totals
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
  const totalSavings = savings.reduce((sum, s) => sum + s.current_amount, 0)
  const totalEmergency = emergencyFunds.reduce((sum, f) => sum + f.current_amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const cashIn = cashTransactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const cashOut = cashTransactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
  const cashOnHand = cashIn - cashOut
  const netWorth = totalAssets + totalSavings + totalEmergency + cashOnHand - totalExpenses

  // This month expenses
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const thisMonthExpenses = expenses
    .filter(e => {
      const d = new Date(e.date)
      return d >= thisMonthStart && d <= thisMonthEnd
    })
    .reduce((sum, e) => sum + e.amount, 0)

  // Monthly expenses chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const total = expenses
      .filter(e => {
        const d = new Date(e.date)
        return d >= start && d <= end
      })
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      month: format(month, 'MMM'),
      expenses: total,
    }
  })

  // Expense category breakdown
  const categoryData = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Recent transactions (last 5)
  const recentExpenses = expenses.slice(0, 5)

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <PageLoader />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            title="Total Assets"
            value={formatCurrency(totalAssets)}
            icon={Wallet}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-50 dark:bg-blue-900/30"
          />
          <StatCard
            title="Total Savings"
            value={formatCurrency(totalSavings)}
            icon={PiggyBank}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-50 dark:bg-green-900/30"
          />
          <StatCard
            title="Emergency Fund"
            value={formatCurrency(totalEmergency)}
            icon={Shield}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-50 dark:bg-purple-900/30"
          />
          <StatCard
            title="Cash on Hand"
            value={formatCurrency(cashOnHand)}
            icon={Banknote}
            iconColor="text-yellow-600 dark:text-yellow-400"
            iconBg="bg-yellow-50 dark:bg-yellow-900/30"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            subtitle={`This month: ${formatCurrency(thisMonthExpenses)}`}
            icon={CreditCard}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 dark:bg-red-900/30"
          />
          <StatCard
            title="Net Worth"
            value={formatCurrency(netWorth)}
            icon={netWorth >= 0 ? TrendingUp : TrendingDown}
            iconColor={netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
            iconBg={netWorth >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Expenses Chart */}
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Monthly Expenses (Last 6 Months)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Expenses']}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area type="monotone" dataKey="expenses" stroke="#3b82f6" strokeWidth={2} fill="url(#expGradient)" dot={{ fill: '#3b82f6', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Expense Categories
            </h2>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                No expense data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={EXPENSE_CATEGORY_COLORS[entry.name] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v)]}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 11, color: '#9ca3af' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Expenses */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Expenses</h2>
              <a href="/expenses" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</a>
            </div>
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No expenses recorded yet</p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map(expense => (
                  <div key={expense.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (EXPENSE_CATEGORY_COLORS[expense.category] || '#6b7280') + '20' }}>
                      <ArrowDownRight className="w-4 h-4" style={{ color: EXPENSE_CATEGORY_COLORS[expense.category] || '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{expense.title}</p>
                      <p className="text-xs text-gray-400">{expense.category} · {formatDate(expense.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-500 shrink-0">
                      -{formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings Overview */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Savings Goals</h2>
              <a href="/savings" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</a>
            </div>
            {savings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No savings goals yet</p>
            ) : (
              <div className="space-y-4">
                {savings.slice(0, 4).map(saving => {
                  const pct = saving.target_amount > 0
                    ? Math.min((saving.current_amount / saving.target_amount) * 100, 100)
                    : 0
                  return (
                    <div key={saving.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{saving.title}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(saving.current_amount)} / {formatCurrency(saving.target_amount)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
