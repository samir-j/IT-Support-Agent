import { useState, useEffect, useRef } from 'react'
import { Ticket, Filter, AlertTriangle, CheckCircle, Clock, RefreshCw, Send, MessageSquare, X, User, Shield, ChevronRight, ArrowUpRight } from 'lucide-react'
import { getTickets, updateTicket, getTicketStats, getTicketMessages, sendTicketMessage } from '../api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const PRIORITY_COLOR = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  High:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Medium:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Low:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const STATUS_COLOR = {
  Open:        'bg-blue-500/10 text-blue-400',
  'In Progress': 'bg-purple-500/10 text-purple-400',
  Escalated:   'bg-red-500/10 text-red-400',
  Resolved:    'bg-emerald-500/10 text-emerald-400',
  Closed:      'bg-slate-500/10 text-slate-400',
}

const ROLE_COLOR = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  agent: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
  user:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function MessageThread({ ticketId, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const user = useAuthStore((s) => s.user)

  const loadMessages = async () => {
    try {
      const { data } = await getTicketMessages(ticketId)
      setMessages(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 8000)
    return () => clearInterval(interval)
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    try {
      const { data } = await sendTicketMessage(ticketId, text)
      setMessages((prev) => [...prev, data])
    } catch {
      toast.error('Failed to send message')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-brand-400" />
          <span className="text-sm font-semibold text-slate-200">Ticket Messages</span>
          <span className="badge bg-slate-800 text-slate-400">{messages.length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <MessageSquare size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-slate-700 mt-1">Start the conversation with the user</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user?.id
            return (
              <div key={m.id} className={clsx('flex gap-3 msg-enter', isMe && 'flex-row-reverse')}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                  m.sender_role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  m.sender_role === 'agent' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' :
                  'bg-slate-700 text-slate-300'
                )}>
                  {m.sender_role === 'admin' ? <Shield size={14} /> :
                   m.sender_role === 'agent' ? <User size={14} /> :
                   <User size={14} />}
                </div>
                <div className={clsx('max-w-[80%]', isMe && 'items-end flex flex-col')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-300">{m.sender_name}</span>
                    <span className={`badge text-[10px] py-0 px-1.5 border ${ROLE_COLOR[m.sender_role]}`}>{m.sender_role}</span>
                    <span className="text-[10px] text-slate-600">
                      {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className={clsx(
                    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  )}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 pb-4 pt-2 border-t border-slate-800">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to the user..."
            rows={1}
            className="input-field flex-1 resize-none min-h-[40px] max-h-24 py-2.5 text-sm"
            style={{ height: 'auto' }}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary px-3 py-2.5 flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState({ status: '', priority: '' })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [chatTicketId, setChatTicketId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [t, s] = await Promise.all([getTickets(filter), getTicketStats()])
      setTickets(t.data)
      setStats(s.data)
    } catch { toast.error('Failed to load tickets') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const handleStatusUpdate = async (id, status) => {
    await updateTicket(id, { status })
    toast.success('Ticket updated')
    load()
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Ticket List */}
      <div className={clsx('flex flex-col overflow-hidden transition-all duration-300', chatTicketId ? 'flex-1' : 'flex-1')}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Support Tickets</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage and track IT support requests</p>
            </div>
            <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Tickets" value={stats.total || 0} icon={Ticket} color="bg-brand-600/10 text-brand-400" />
            <StatCard label="Open" value={stats.open || 0} icon={Clock} color="bg-blue-500/10 text-blue-400" />
            <StatCard label="Escalated" value={stats.escalated || 0} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
            <StatCard label="Resolved" value={stats.resolved || 0} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-3 border-b border-slate-800 flex items-center gap-3">
          <Filter size={14} className="text-slate-500" />
          <select
            className="input-field w-auto text-xs py-1.5"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            {['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            className="input-field w-auto text-xs py-1.5"
            value={filter.priority}
            onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">All Priority</option>
            {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600">
              <Ticket size={28} className="mb-3 opacity-40" />
              <p className="text-sm">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className={clsx(
                    'card p-4 transition-all cursor-pointer',
                    chatTicketId === t.id ? 'border-brand-500/40 bg-brand-900/10' : 'hover:border-slate-700'
                  )}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{t.ticket_number}</span>
                        <span className={`badge border ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                        <span className={`badge ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                        {t.escalated && <span className="badge bg-red-500/10 text-red-400"><AlertTriangle size={10} className="mr-0.5" />Escalated</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-200 truncate">{t.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.category} · {t.created_at ? format(new Date(t.created_at), 'MMM d, yyyy HH:mm') : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setChatTicketId(chatTicketId === t.id ? null : t.id) }}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all border',
                          chatTicketId === t.id
                            ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
                        )}
                        title="Open message thread"
                      >
                        <MessageSquare size={12} /> Chat
                      </button>
                      {t.status !== 'Resolved' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusUpdate(t.id, 'Resolved') }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  {selected?.id === t.id && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-400 leading-relaxed">{t.description || 'No description'}</p>
                      {t.confidence_score != null && (
                        <p className="text-xs text-slate-600 mt-2">AI Confidence: {Math.round(t.confidence_score * 100)}%</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        {['In Progress', 'Escalated', 'Closed'].filter(s => s !== t.status).map((s) => (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(t.id, s) }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all"
                          >
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Panel */}
      {chatTicketId && (
        <div className="w-[420px] flex-shrink-0 border-l border-slate-800 bg-slate-950 animate-slideIn">
          <MessageThread ticketId={chatTicketId} onClose={() => setChatTicketId(null)} />
        </div>
      )}
    </div>
  )
}
