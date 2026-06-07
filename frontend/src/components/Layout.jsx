import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, Ticket, BarChart3, FileText, LogOut, Bot, Shield } from 'lucide-react'
import useAuthStore from '../store/authStore'
import clsx from 'clsx'

const nav = [
  { to: '/chat', icon: MessageSquare, label: 'Chat', roles: ['user', 'agent', 'admin'] },
  { to: '/my-tickets', icon: Ticket, label: 'My Tickets', roles: ['user', 'agent', 'admin'] },
  { to: '/tickets', icon: Ticket, label: 'Manage Tickets', roles: ['agent', 'admin'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin'] },
  { to: '/documents', icon: FileText, label: 'Knowledge Base', roles: ['agent', 'admin'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = nav.filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">IT Helpdesk</p>
            <p className="text-xs text-slate-500">AI-Powered Support</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize flex items-center gap-1">
                {user?.role === 'admin' && <Shield size={10} className="text-amber-400" />}
                {user?.role}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
