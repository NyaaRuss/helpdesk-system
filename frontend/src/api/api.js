import axios from 'axios';

// baseURL remains localhost to ensure stability within your development environment
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
    
    // Attempt token refresh if unauthorized and not already retrying
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
      
      // Clear data and redirect if refresh fails
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
};

// Helpdesk and eGP Scraper Endpoints
export const ticketAPI = {
  getAllTickets: () => api.get('/tickets/'),
  getTicket: (id) => api.get(`/tickets/${id}/`),
  createTicket: (data) => api.post('/tickets/create/', data),
  updateTicket: (id, data) => api.patch(`/tickets/${id}/`, data),
  assignTicket: (tid, eids, note) => api.post(`/tickets/${tid}/assign/`, { engineer_ids: eids, note }),
  
  // Dashboard/Performance Endpoints
  getEngineerPerformance: () => api.get('/tickets/performance/'),
  
  /**
   * Added: Allows Admins to fetch performance for a specific engineer ID.
   * Backend URL expected: /tickets/performance/<id>/
   */
  getEngineerPerformanceById: (id) => api.get(`/tickets/performance/${id}/`),

  getTicketMessages: (id) => api.get(`/tickets/${id}/messages/`),
  getTicketLogs: (id) => api.get(`/tickets/${id}/logs/`),
  sendMessage: (data) => api.post('/tickets/messages/create/', data),
  getDashboardStats: () => api.get('/tickets/dashboard/stats/'),
  
  /**
   * Scraper endpoint for Live Bulletin Board.
   */
  getTenders: () => api.get('/tickets/tenders/'), 
};

// SLA Endpoints
export const slaAPI = {
  getSLAs: () => api.get('/tickets/slas/'),
  createSLA: (data) => api.post('/tickets/slas/', data),
};

export default api;