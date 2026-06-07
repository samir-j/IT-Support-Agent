import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import TicketsPage from './pages/TicketsPage'
import MyTicketsPage from './pages/MyTicketsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DocumentsPage from './pages/DocumentsPage'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RoleRoute({ children, roles }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/chat" replace />
  }
  return children
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth)
  useEffect(() => { initAuth() }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:conversationId" element={<ChatPage />} />
        <Route path="my-tickets" element={<MyTicketsPage />} />
        <Route path="tickets" element={<RoleRoute roles={['agent', 'admin']}><TicketsPage /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute roles={['admin']}><AnalyticsPage /></RoleRoute>} />
        <Route path="documents" element={<RoleRoute roles={['agent', 'admin']}><DocumentsPage /></RoleRoute>} />
      </Route>
    </Routes>
  )
}
