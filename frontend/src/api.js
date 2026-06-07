import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Chat API
export const sendMessage = (data) => api.post('/chat/message', data)
export const getConversations = () => api.get('/chat/conversations')
export const getMessages = (id) => api.get(`/chat/conversations/${id}/messages`)
export const deleteConversation = (id) => api.delete(`/chat/conversations/${id}`)
export const summarizeConversation = (id) => api.post(`/chat/conversations/${id}/summarize`)

// Tickets API
export const getTickets = (params) => api.get('/tickets/', { params })
export const getTicket = (id) => api.get(`/tickets/${id}`)
export const updateTicket = (id, data) => api.patch(`/tickets/${id}`, data)
export const getTicketStats = () => api.get('/tickets/stats/summary')

// Ticket Messaging API
export const getTicketMessages = (ticketId) => api.get(`/tickets/${ticketId}/messages`)
export const sendTicketMessage = (ticketId, content) => api.post(`/tickets/${ticketId}/messages`, { content })

// Documents API
export const uploadDocument = (formData) => api.post('/documents/upload', formData)
export const getDocuments = () => api.get('/documents/')
export const getKBStats = () => api.get('/documents/stats')

// Analytics API
export const getDashboard = () => api.get('/analytics/dashboard')

export default api
