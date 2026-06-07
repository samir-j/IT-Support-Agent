import { useState, useEffect, useRef } from 'react'
import { Ticket, Send, MessageSquare, X, User, Shield, Clock, CheckCircle, AlertTriangle, ChevronLeft, Bot } from 'lucide-react'
import { getTickets, getTicketMessages, sendTicketMessage } from '../api'
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

const STATUS_ICON = {
  Open:        Clock,
  'In Progress': Clock,
  Escalated:   AlertTriangle,
  Resolved:    CheckCircle,
  Closed:      CheckCircle,
}

const ROLE_COLOR = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  agent: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
  user:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const user = useAuthStore((s) => s.user)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const { data } = await getTickets()
      setTickets(data)
    } catch { toast.error('Failed to load tickets') }
    finally { setLoading(false) }
  }

  const loadMessages = async (ticketId) => {
    setMessagesLoading(true)
    try {
      const { data } = await getTicketMessages(ticketId)
      setMessages(data)
    } catch { /* ignore */ }
    finally { setMessagesLoading(false) }
  }

  useEffect(() => { loadTickets() }, [])

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id)
      const interval = setInterval(() => loadMessages(selectedTicket.id), 8000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending || !selectedTicket) return
    const text = input.trim()
    setInput('')
    setSending(true)
    try {
      const { data } = await sendTicketMessage(selectedTicket.id, text)
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

  // Detail/Chat view
  if (selectedTicket) {
    const StatusIcon = STATUS_ICON[selectedTicket.status] || Clock
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-4">
          <button onClick={() => { setSelectedTicket(null); setMessages([]) }} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-slate-500">{selectedTicket.ticket_number}</span>
              <span className={`badge border ${PRIORITY_COLOR[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
              <span className={`badge ${STATUS_COLOR[selectedTicket.status]}`}>
                <StatusIcon size={10} className="mr-1" />{selectedTicket.status}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-200 truncate">{selectedTicket.subject}</h2>
          </div>
        </div>

        {/* Ticket description */}
        {selectedTicket.description && (
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Description</p>
            <p className="text-sm text-slate-300 leading-relaxed">{selectedTicket.description}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messagesLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600">
              <MessageSquare size={24} className="mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-slate-700 mt-1">Send a message to get help from our support team</p>
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
                     m.sender_role === 'agent' ? <Bot size={14} /> :
                     <User size={14} />}
                  </div>
                  <div className={clsx('max-w-[75%]', isMe && 'items-end flex flex-col')}>
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
                        : m.sender_role === 'admin'
                          ? 'bg-amber-900/20 border border-amber-800/30 text-slate-200 rounded-tl-sm'
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
        <div className="px-6 pb-5 pt-3 border-t border-slate-800">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply to support team..."
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

  // Ticket list view
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100">My Tickets</h1>
        <p className="text-sm text-slate-500 mt-0.5">View your support requests and chat with the support team</p>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-600">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Ticket size={24} className="opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-400">No tickets yet</p>
            <p className="text-xs text-slate-600 mt-1">Start a chat and create a ticket to get support</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const StatusIcon = STATUS_ICON[t.status] || Clock
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="card p-5 hover:border-slate-700 hover:bg-slate-900/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-slate-500">{t.ticket_number}</span>
                        <span className={`badge border ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                        <span className={`badge ${STATUS_COLOR[t.status]}`}>
                          <StatusIcon size={10} className="mr-1" />{t.status}
                        </span>
                        {t.escalated && <span className="badge bg-red-500/10 text-red-400"><AlertTriangle size={10} className="mr-0.5" />Escalated</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-200 mb-1">{t.subject}</p>
                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-2">{t.category} · {t.created_at ? format(new Date(t.created_at), 'MMM d, yyyy HH:mm') : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <span className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center gap-1.5">
                        <MessageSquare size={12} /> Open
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
