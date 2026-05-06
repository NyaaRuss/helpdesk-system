// src/api/api.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, 
});

// Request interceptor for token authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh and session management
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken
          });
          localStorage.setItem('token', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        }
      } catch (err) {
        console.error('Refresh failed', err);
      }
      
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication Endpoints
export const authAPI = {
  login: (creds) => api.post('/auth/login/', creds),
  register: (data) => api.post('/auth/register/', data),
  getUsers: (type) => api.get(`/auth/users/?user_type=${type}`),
  getProfile: () => api.get('/auth/profile/'),
  
  // Profile update endpoints
  updateProfile: (data) => {
    // For FormData (profile picture upload)
    if (data instanceof FormData) {
      return api.patch('/auth/update-profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    // For regular JSON data
    return api.patch('/auth/update-profile/', data);
  },
  
  deleteProfilePicture: () => api.delete('/auth/delete-profile-picture/'),
  
  // Delete a user (admin only)
  deleteUser: (userId, reason) => api.delete(`/auth/users/${userId}/`, { data: { reason } }),
  
  // Password Reset Endpoints
  requestPasswordReset: (email) => api.post('/auth/password-reset-request/', { email }),
  verifyResetCode: (email, code) => api.post('/auth/verify-reset-code/', { email, code }),
  resetPassword: (email, code, new_password, confirm_password) => 
    api.post('/auth/reset-password/', { email, code, new_password, confirm_password }),
};

// Helpdesk and eGP Scraper Endpoints
export const ticketAPI = {
  getAllTickets: () => api.get('/tickets/'),
  getTicket: (id) => api.get(`/tickets/${id}/`),
  createTicket: async (data) => {
    const response = await api.post('/tickets/create/', data);
    if (response.data && !response.data.id && response.data.ticket) {
      response.data.id = response.data.ticket.id;
    }
    return response;
  },
  updateTicket: (id, data) => api.patch(`/tickets/${id}/`, data),
  assignTicket: (tid, eids, note) => api.post(`/tickets/${tid}/assign/`, { engineer_ids: eids, note }),
  
  // Delete ticket with reason
  deleteTicket: (id, reason) => api.delete(`/tickets/${id}/`, { data: { reason } }),
  
  getEngineerPerformance: () => api.get('/tickets/performance/'),
  getEngineerPerformanceById: (id) => api.get(`/tickets/performance/${id}/`),
  getTicketMessages: (id) => api.get(`/tickets/${id}/messages/`),
  getTicketLogs: (id) => api.get(`/tickets/${id}/logs/`),
  sendMessage: (data) => api.post('/tickets/messages/create/', data),
  getDashboardStats: () => api.get('/tickets/dashboard/stats/'),
  getTenders: () => api.get('/tickets/tenders/'),
  
  // Email handling endpoints
  processEmails: () => api.post('/tickets/emails/process/'),
  testEmailToTicket: (data) => api.post('/tickets/emails/test/', data),
  
  // Escalation endpoints
  escalateTicket: (ticketId, reason) => api.post(`/tickets/${ticketId}/escalate/`, { reason }),
  getEscalationStatus: () => api.get('/tickets/escalations/status/'),
  
  // Progress tracking
  getTicketProgress: (ticketId) => api.get(`/tickets/${ticketId}/progress/`),
  
  // Email comment
  sendEmailComment: (ticketId, content) => api.post(`/tickets/${ticketId}/email-comment/`, { content }),
  
  // Enhanced analytics endpoints for dashboard
  getTicketMetrics: (params) => api.get('/tickets/metrics/', { params }),
  getEngineerMetrics: (params) => api.get('/tickets/engineer-metrics/', { params }),
  getResolutionStats: (params) => api.get('/tickets/resolution-stats/', { params }),
  getPriorityAnalytics: (params) => api.get('/tickets/priority-analytics/', { params }),
  
  // NEW: Time tracking and timeline endpoints
  updateTicketTime: (id, data) => api.post(`/tickets/${id}/update-time/`, data),
  getTicketTimeline: (id) => api.get(`/tickets/${id}/timeline/`),
};

// SLA Endpoints
export const slaAPI = {
  getSLAs: () => api.get('/tickets/slas/'),
  createSLA: (data) => api.post('/tickets/slas/', data),
  updateSLA: (id, data) => api.patch(`/tickets/slas/${id}/`, data),
};

// Reports API
export const reportsAPI = {
  getPerformanceReport: (params) => api.get('/reports/performance/', { params }),
  getTicketReport: (params) => api.get('/reports/tickets/', { params }),
  exportDashboardData: (data) => api.post('/reports/export-dashboard/', data),
};

export default api;