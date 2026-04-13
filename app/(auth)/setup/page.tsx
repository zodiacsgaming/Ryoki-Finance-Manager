'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, CheckCircle, ArrowRight, Database } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SetupPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  useEffect(() => {
    fetch('/api/setup')
      .then(r => r.json())
      .then(({ needsSetup }) => {
        if (!needsSetup) router.replace('/login')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Email and password are required'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">First-Time Setup</h1>
          <p className="text-slate-400 mt-1 text-sm">Create your Super Admin account to get started</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Setup Complete!</h2>
              <p className="text-slate-400 text-sm">Your Super Admin account is ready. You can now log in.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full btn-primary mt-2"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Super Admin Account</p>
                  <p className="text-blue-400">This account will have full access to manage users and all data. Setup can only be done once.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    className="input-base"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address <span className="text-red-400">*</span></label>
                  <input
                    className="input-base"
                    type="email"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Use the email you already created in Supabase Auth, or enter a new one.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input
                      className="input-base pr-10"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full btn-primary" disabled={loading}>
                  <Shield className="w-4 h-4" />
                  {loading ? 'Setting up...' : 'Create Super Admin Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
