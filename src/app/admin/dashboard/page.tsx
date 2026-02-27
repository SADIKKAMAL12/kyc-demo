'use client'
// src/app/admin/dashboard/page.tsx

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Shield, LogOut, Plus, Copy, Check, Users, Clock,
  CheckCircle, XCircle, Link2, Mail, User, ChevronDown,
  RefreshCw, FileText, Camera, Eye,
} from 'lucide-react'
import type { KYCRequest, VerificationRecord, GenerateLinkPayload } from '@/types'

function StatusBadge({ status }: { status: KYCRequest['status'] }) {
  const styles: Record<string, string> = {
    pending:     'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    in_progress: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    completed:   'bg-green-500/15 text-green-400 border border-green-500/30',
    failed:      'bg-red-500/15 text-red-400 border border-red-500/30',
    expired:     'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  }
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${styles[status] || ''}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function VerificationBadge({ status }: { status: VerificationRecord['verification_status'] }) {
  const styles: Record<string, string> = {
    pending:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    approved: 'bg-green-500/15 text-green-400 border border-green-500/30',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
  }
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${styles[status] || ''}`}>
      {status}
    </span>
  )
}

export default function AdminDashboard() {
  const router  = useRouter()
  const supabase = createClient()

  const [requests,      setRequests]      = useState<KYCRequest[]>([])
  const [verifications, setVerifications] = useState<Record<string, VerificationRecord>>({})
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [generating,    setGenerating]    = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied,        setCopied]        = useState(false)
  const [showForm,      setShowForm]      = useState(false)
  const [form,          setForm]          = useState({ first_name: '', last_name: '', email: '' })
  const [formError,     setFormError]     = useState<string | null>(null)

  const loadRequests = async () => {
    setLoading(true)

    const { data: reqData } = await supabase
      .from('kyc_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (reqData) setRequests(reqData)

    const { data: verData } = await supabase
      .from('verification_records')
      .select('*')
    if (verData) {
      const map: Record<string, VerificationRecord> = {}
      verData.forEach((v: VerificationRecord) => { map[v.kyc_request_id] = v })
      setVerifications(map)
    }

    setLoading(false)
  }

  useEffect(() => { loadRequests() }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setFormError(null)
    setGeneratedLink(null)

    try {
      const res  = await fetch('/api/admin/generate-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form as GenerateLinkPayload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate link')
      setGeneratedLink(data.link)
      setForm({ first_name: '', last_name: '', email: '' })
      loadRequests()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const stats = {
    total:     requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    failed:    requests.filter(r => r.status === 'failed').length,
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 right-0 w-96 h-96 rounded-full bg-brand-600/8 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-brand-800/8 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">KYC Dashboard</h1>
            <p className="text-xs text-white/40">Admin Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',     value: stats.total,     icon: Users,        color: 'text-white' },
          { label: 'Pending',   value: stats.pending,   icon: Clock,        color: 'text-yellow-400' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle,  color: 'text-green-400' },
          { label: 'Failed',    value: stats.failed,    icon: XCircle,      color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40 font-medium">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Generate Link Section */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowForm(!showForm)}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-brand-400" />
            </div>
            <span className="font-semibold text-white">Generate KYC Link</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </div>

        {showForm && (
          <div className="mt-5 animate-in">
            <form onSubmit={handleGenerate} className="space-y-4">
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="John"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Doe"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Generate Secure Link
                  </>
                )}
              </button>
            </form>

            {generatedLink && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/25 rounded-xl animate-in">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Link Generated!</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <code className="flex-1 text-xs text-white/70 bg-white/5 rounded-lg px-3 py-2.5 overflow-hidden text-ellipsis whitespace-nowrap block">
                    {generatedLink}
                  </code>
                  <button
                    onClick={copyLink}
                    className="flex-shrink-0 p-2.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Requests Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="font-semibold text-white">KYC Requests</h2>
          <p className="text-xs text-white/40 mt-0.5">{requests.length} total records</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full spinner" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No requests yet. Generate your first KYC link above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-white/30 font-medium">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Created</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const ver        = verifications[req.id]
                  const isExpanded = expandedId === req.id
                  return (
                    <React.Fragment key={req.id}>
                      <tr className="border-t border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-white font-medium">
                          {req.first_name} {req.last_name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-white/60">{req.email}</td>
                        <td className="px-5 py-3.5 text-xs text-white/40 hidden sm:table-cell">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          {ver && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : req.id)}
                              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'View'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </td>
                      </tr>

                      {isExpanded && ver && (
                        <tr className="border-t border-white/5 bg-white/2">
                          <td colSpan={5} className="px-5 py-5">
                            <div className="space-y-4">

                              {/* Verification meta */}
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs text-white/40">Verification:</span>
                                <VerificationBadge status={ver.verification_status} />
                                {ver.document_type && (
                                  <span className="text-xs text-white/50 capitalize bg-white/5 px-2 py-0.5 rounded-full">
                                    {ver.document_type.replace('_', ' ')}
                                  </span>
                                )}
                                {ver.country && (
                                  <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                                    {ver.country}
                                  </span>
                                )}
                              </div>

                              {/* OCR Data */}
                              {ver.ocr_data_json && (
                                <div className="bg-white/5 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-3.5 h-3.5 text-brand-400" />
                                    <span className="text-xs font-semibold text-white/70">Extracted Data (OCR)</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {ver.ocr_data_json.name && (
                                      <div>
                                        <div className="text-xs text-white/30 mb-0.5">Name</div>
                                        <div className="text-sm text-white">{ver.ocr_data_json.name}</div>
                                      </div>
                                    )}
                                    {ver.ocr_data_json.dob && (
                                      <div>
                                        <div className="text-xs text-white/30 mb-0.5">Date of Birth</div>
                                        <div className="text-sm text-white">{ver.ocr_data_json.dob}</div>
                                      </div>
                                    )}
                                    {ver.ocr_data_json.document_number && (
                                      <div>
                                        <div className="text-xs text-white/30 mb-0.5">Document No.</div>
                                        <div className="text-sm text-white font-mono">{ver.ocr_data_json.document_number}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Document images */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {ver.document_front_url && (
                                  <a href={ver.document_front_url} target="_blank" rel="noopener noreferrer" className="group">
                                    <div className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> Document Front
                                    </div>
                                    <img
                                      src={ver.document_front_url}
                                      alt="Document Front"
                                      className="w-full h-28 object-cover rounded-lg border border-white/10 group-hover:border-brand-500/50 transition-colors"
                                    />
                                  </a>
                                )}
                                {ver.document_back_url && (
                                  <a href={ver.document_back_url} target="_blank" rel="noopener noreferrer" className="group">
                                    <div className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> Document Back
                                    </div>
                                    <img
                                      src={ver.document_back_url}
                                      alt="Document Back"
                                      className="w-full h-28 object-cover rounded-lg border border-white/10 group-hover:border-brand-500/50 transition-colors"
                                    />
                                  </a>
                                )}
                                {ver.selfie_url && (
                                  <a href={ver.selfie_url} target="_blank" rel="noopener noreferrer" className="group">
                                    <div className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                                      <Camera className="w-3 h-3" /> Selfie
                                    </div>
                                    <img
                                      src={ver.selfie_url}
                                      alt="Selfie"
                                      className="w-full h-28 object-cover rounded-lg border border-white/10 group-hover:border-brand-500/50 transition-colors"
                                    />
                                  </a>
                                )}
                              </div>

                              <div className="text-xs text-white/25">
                                Submitted: {new Date(ver.created_at).toLocaleString()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
