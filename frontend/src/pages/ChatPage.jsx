import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Plus, Trash2, Ticket, FileText, ChevronDown, Bot, User, AlertTriangle, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendMessage, getConversations, getMessages, deleteConversation, summarizeConversation } from '../api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function TypingIndicator() {
  return (
    <div className="flex gap-3 msg-enter">
      <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-brand-400" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 rounded-2xl rounded-tl-sm">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }) {
  const pct = Math.round((confidence || 0) * 100)
  const color = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs ${color} font-mono`}>{pct}% confidence</span>
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3 msg-enter', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
        isUser ? 'bg-slate-700 text-slate-300' : 'bg-brand-600/20 border border-brand-500/30 text-brand-400'
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={clsx('max-w-[75%]', isUser && 'items-end flex flex-col')}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-slate-800 text-slate-200 rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            {msg.confidence != null && <ConfidenceBadge confidence={msg.confidence} />}
            {msg.agent_used && (
              <span className="text-xs text-slate-600 capitalize">{msg.agent_used} agent</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [createTicket, setCreateTicket] = useState(false)
  const [currentConvId, setCurrentConvId] = useState(conversationId || null)
  const [summary, setSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await getConversations()
      setConversations(data)
    } catch {}
  }, [])

  const loadMessages = useCallback(async (id) => {
    if (!id) return
    try {
      const { data } = await getMessages(id)
      setMessages(data)
    } catch {}
  }, [])

  useEffect(() => { loadConversations() }, [])
  useEffect(() => {
    if (conversationId) {
      setCurrentConvId(conversationId)
      loadMessages(conversationId)
    } else {
      setMessages([])
      setCurrentConvId(null)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { id: 'tmp', role: 'user', content: text, created_at: new Date() }])
    setLoading(true)

    try {
      const { data } = await sendMessage({ message: text, conversation_id: currentConvId, create_ticket: createTicket })
      if (!currentConvId) {
        setCurrentConvId(data.conversation_id)
        navigate(`/chat/${data.conversation_id}`, { replace: true })
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'tmp'),
        { id: 'tmp-u', role: 'user', content: text, created_at: new Date() },
        {
          id: data.message_id,
          role: 'assistant',
          content: data.response,
          agent_used: data.agent_used,
          confidence: data.confidence,
          sources: data.sources,
          created_at: new Date(),
        },
      ])
      if (data.ticket) toast.success(`Ticket ${data.ticket.ticket_number} created`)
      if (data.needs_escalation && !data.ticket) toast('Low confidence — consider creating a ticket', { icon: '⚠️' })
      loadConversations()
    } catch (err) {
      toast.error('Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== 'tmp'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDelete = async (id) => {
    await deleteConversation(id)
    loadConversations()
    if (id === currentConvId) {
      setMessages([])
      setCurrentConvId(null)
      navigate('/chat')
    }
  }

  const handleSummarize = async () => {
    if (!currentConvId) return
    try {
      const { data } = await summarizeConversation(currentConvId)
      setSummary(data)
      setShowSummary(true)
    } catch { toast.error('Summary failed') }
  }

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900/50 border-r border-slate-800">
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => { navigate('/chat'); setMessages([]); setCurrentConvId(null) }}
            className="w-full flex items-center gap-2 btn-primary py-2 text-sm justify-center"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={clsx(
                'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all',
                c.id === currentConvId ? 'bg-brand-600/10 border border-brand-600/20 text-slate-200' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              )}
              onClick={() => navigate(`/chat/${c.id}`)}
            >
              <span className="flex-1 truncate text-xs">{c.title || 'Untitled'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-6">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-slate-300">
              {currentConvId ? 'Active Conversation' : 'IT Support Assistant'}
            </span>
          </div>
          {currentConvId && (
            <button onClick={handleSummarize} className="text-xs btn-ghost flex items-center gap-1.5">
              <FileText size={12} /> Summarize
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center mb-4">
                <Bot size={28} className="text-brand-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2">How can I help?</h2>
              <p className="text-sm text-slate-500 max-w-sm">Ask me about VPN, email, passwords, printers, or any IT issue. I'll search our knowledge base and provide step-by-step solutions.</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['My VPN won\'t connect', 'Reset my password', 'Email not syncing', 'Printer offline'].map((q) => (
                  <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-brand-500/50 hover:text-brand-400 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Summary modal */}
        {showSummary && summary && (
          <div className="mx-6 mb-4 card p-4 border-brand-600/30 bg-brand-900/20">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold text-brand-300">Incident Report</h3>
              <button onClick={() => setShowSummary(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
            </div>
            <p className="text-xs text-slate-300 mb-2"><strong className="text-slate-400">Issue:</strong> {summary.issue}</p>
            <p className="text-xs text-slate-300 mb-2"><strong className="text-slate-400">Summary:</strong> {summary.summary}</p>
            {summary.actions_taken?.length > 0 && (
              <div className="mb-2">
                <strong className="text-xs text-slate-400">Actions:</strong>
                <ul className="mt-1 space-y-0.5">
                  {summary.actions_taken.map((a, i) => <li key={i} className="text-xs text-slate-400">• {a}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-300"><strong className="text-slate-400">Status:</strong> {summary.status}</p>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 pb-6 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createTicket}
                onChange={(e) => setCreateTicket(e.target.checked)}
                className="w-3 h-3 accent-brand-500"
              />
              <Ticket size={11} /> Create support ticket
            </label>
          </div>
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your IT issue..."
              rows={1}
              className="input-field flex-1 resize-none min-h-[42px] max-h-32 py-2.5"
              style={{ height: 'auto' }}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="btn-primary px-4 py-2.5 flex-shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
