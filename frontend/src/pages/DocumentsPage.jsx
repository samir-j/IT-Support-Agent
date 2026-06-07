import { useState, useEffect, useRef } from 'react'
import { FileText, Upload, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getDocuments, uploadDocument, getKBStats } from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [stats, setStats] = useState({ total_vectors: 0 })
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const [d, s] = await Promise.all([getDocuments(), getKBStats()])
      setDocs(d.data)
      setStats(s.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await uploadDocument(form)
      toast.success(`Uploaded: ${data.chunks} chunks indexed`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Knowledge Base</h1>
            <p className="text-sm text-slate-500 mt-0.5">Documents indexed for AI retrieval</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".txt,.md,.pdf" onChange={handleUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary flex items-center gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Total Vectors in ChromaDB</p>
            <p className="text-2xl font-bold text-brand-400">{stats.total_vectors?.toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Uploaded Documents</p>
            <p className="text-2xl font-bold text-slate-200">{docs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Supported Formats</p>
            <p className="text-sm font-medium text-slate-300 mt-1">.txt · .md · .pdf</p>
          </div>
        </div>
      </div>

      {/* Dataset info banner */}
      <div className="mx-8 mt-5 p-4 rounded-xl bg-brand-600/5 border border-brand-600/20 flex items-start gap-3">
        <Database size={16} className="text-brand-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-brand-300">Pre-loaded Datasets</p>
          <p className="text-xs text-slate-500 mt-0.5">
            The knowledge base is pre-indexed with <strong className="text-slate-400">Bitext Customer Support LLM Dataset</strong> (500 QA pairs)
            and <strong className="text-slate-400">IT Helpdesk Synthetic Tickets</strong> from HuggingFace.
            Upload additional company-specific documents below.
          </p>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Uploaded Documents</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Upload .txt, .md, or .pdf files to expand the knowledge base</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.chunk_count} chunks · {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
