import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { getDashboard } from '../api'
import { TrendingUp, MessageSquare, Ticket, AlertTriangle, Brain } from 'lucide-react'

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']

function KPICard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading analytics...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No data available yet.</div>

  const { tickets, performance, timeline } = data

  const statusData = Object.entries(tickets.by_status || {}).map(([name, value]) => ({ name, value }))
  const priorityData = [
    { name: 'Critical', value: tickets.by_priority?.Critical || 0 },
    { name: 'High', value: tickets.by_priority?.High || 0 },
    { name: 'Medium', value: tickets.by_priority?.Medium || 0 },
    { name: 'Low', value: tickets.by_priority?.Low || 0 },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-8 py-6">
        <h1 className="text-xl font-bold text-slate-100 mb-1">Analytics</h1>
        <p className="text-sm text-slate-500 mb-8">System performance and ticket insights</p>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Tickets" value={tickets.total} icon={Ticket} color="bg-brand-600/10 text-brand-400" />
          <KPICard label="Total Conversations" value={performance.total_conversations} icon={MessageSquare} color="bg-cyan-500/10 text-cyan-400" />
          <KPICard label="Escalation Rate" value={`${performance.escalation_rate}%`} sub="needs human review" icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
          <KPICard label="Avg AI Confidence" value={`${performance.avg_confidence}%`} sub="retrieval accuracy" icon={Brain} color="bg-emerald-500/10 text-emerald-400" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Ticket by Category */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-5">Tickets by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tickets.by_category} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status distribution */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-5">Status Distribution</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-400">{item.name}</span>
                      <span className="text-xs font-mono text-slate-300 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-slate-600 text-center py-16">No ticket data yet</p>}
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Tickets Created (Last 7 Days)</h3>
          {timeline?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={timeline} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-600 text-center py-10">No timeline data yet</p>}
        </div>
      </div>
    </div>
  )
}
