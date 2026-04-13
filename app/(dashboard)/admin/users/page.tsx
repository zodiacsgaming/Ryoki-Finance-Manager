'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Users, Shield, Eye, EyeOff, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react'
import type { Profile } from '@/types/database'

const emptyCreateForm = { email: '', password: '', full_name: '', role: 'user' as 'super_admin' | 'user' }
const emptyEditForm = { full_name: '', role: 'user' as 'super_admin' | 'user', is_active: true }

export default function UserManagementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'super_admin') { router.push('/dashboard'); toast.error('Access denied'); return }

    setCurrentUserId(session.user.id)
    fetchUsers()
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password) { toast.error('Email and password required'); return }
    if (createForm.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User created successfully')
      setCreateModal(false)
      setCreateForm(emptyCreateForm)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User updated')
      setEditModal(false)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !newPassword) { toast.error('Password is required'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Password reset successfully')
      setResetModal(false)
      setNewPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: Profile) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User deleted')
      setDeleteDialog(false)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (user: Profile) => {
    setSelectedUser(user)
    setEditForm({ full_name: user.full_name || '', role: user.role, is_active: user.is_active })
    setEditModal(true)
  }

  const filtered = useMemo(() => users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  ), [users, search])

  if (loading) return <DashboardLayout title="User Management"><PageLoader /></DashboardLayout>

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage all user accounts</p>
          </div>
          <button onClick={() => { setCreateForm(emptyCreateForm); setCreateModal(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Create User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-blue-600' },
            { label: 'Active', value: users.filter(u => u.is_active).length, color: 'text-green-600' },
            { label: 'Admins', value: users.filter(u => u.role === 'super_admin').length, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description={search ? 'Try a different search' : 'Create the first user account'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">User</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Role</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Joined</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {(user.full_name?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.full_name || '—'}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                          {user.id === currentUserId && (
                            <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px]">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {user.role === 'super_admin' ? (
                          <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                            <Shield className="w-3 h-3" /> Super Admin
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">User</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleToggleActive(user)} disabled={user.id === currentUserId}
                          className="flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                          {user.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-green-500" />
                              <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                              <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500">Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedUser(user); setNewPassword(''); setResetModal(true) }}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Reset Password">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedUser(user); setDeleteDialog(true) }}
                            disabled={user.id === currentUserId}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input className="input-base" value={createForm.full_name}
              onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
            <input className="input-base" type="email" value={createForm.email}
              onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password * (min. 8 chars)</label>
            <div className="relative">
              <input className="input-base pr-10" type={showPassword ? 'text' : 'password'} value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
            <select className="input-base" value={createForm.role}
              onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'super_admin' | 'user' }))}>
              <option value="user">User</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit User">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input className="input-base" value={editForm.full_name}
              onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
            <select className="input-base" value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'super_admin' | 'user' }))}
              disabled={selectedUser?.id === currentUserId}>
              <option value="user">User</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <input type="checkbox" id="is_active" checked={editForm.is_active}
              onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
              disabled={selectedUser?.id === currentUserId}
              className="w-4 h-4 rounded text-blue-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Account is active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={resetModal} onClose={() => setResetModal(false)} title={`Reset Password — ${selectedUser?.email}`} size="sm">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password *</label>
            <div className="relative">
              <input className="input-base pr-10" type={showPassword ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setResetModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete User" message={`Are you sure you want to permanently delete ${selectedUser?.email}? All their data will be lost.`}
        loading={deleting} confirmLabel="Delete User" />
    </DashboardLayout>
  )
}
