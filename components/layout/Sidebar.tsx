'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Shield,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  TrendingUp,
  X,
  LogOut,
  Banknote,
} from 'lucide-react'
import type { Profile } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Wallet },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/emergency-fund', label: 'Emergency Fund', icon: Shield },
  { href: '/cash-on-hand', label: 'Cash on Hand', icon: Banknote },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/statistics', label: 'Statistics', icon: BarChart3 },
]

const adminItems = [
  { href: '/admin/users', label: 'User Management', icon: Users },
]

interface SidebarProps {
  profile: Profile | null
  onClose?: () => void
  onSignOut: () => void
}

export default function Sidebar({ profile, onClose, onSignOut }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Finance Tracker</h1>
            <p className="text-xs text-slate-400">Personal Finance</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profile summary */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
          {profile?.role === 'super_admin' && (
            <span className="ml-auto shrink-0 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-1">
          Main Menu
        </p>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              )}
            >
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {profile?.role === 'super_admin' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-5">
              Administration
            </p>
            {adminItems.map(item => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/60 space-y-1">
        <Link
          href="/settings"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            pathname === '/settings'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
          )}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          Settings
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
