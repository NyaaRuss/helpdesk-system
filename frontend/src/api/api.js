import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('token', newAccessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // If refresh fails or no refresh token, logout
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    console.log('API: Login attempt with:', credentials.username);
    try {
      const response = await api.post('/auth/login/', credentials);
      console.log('API: Login success:', response.data);
      return response;
    } catch (error) {
      console.error('API: Login error:', error.response?.data || error.message);
      throw error;
    }
  },
  register: async (userData) => {
    console.log('API: Registration attempt:', userData.username);
    try {
      const response = await api.post('/auth/register/', userData);
      console.log('API: Registration success:', response.data);
      return response;
    } catch (error) {
      console.error('API: Registration error:', error.response?.data || error.message);
      throw error;
    }
  },
  // ... rest of the functions
};

// Ticket API
export const ticketAPI = {
  getAllTickets: () => api.get('/tickets/'),
  getTicket: (id) => api.get(`/tickets/${id}/`),
  createTicket: (data) => api.post('/tickets/create/', data),
  updateTicket: (id, data) => api.put(`/tickets/${id}/`, data),
  assignTicket: (id, engineerId, note) => 
    api.post(`/tickets/${id}/assign/`, { engineer_id: engineerId, note }),
  getTicketMessages: (ticketId) => api.get(`/tickets/${ticketId}/messages/`),
  getTicketLogs: (ticketId) => api.get(`/tickets/${ticketId}/logs/`),
  sendMessage: (data) => api.post('/tickets/messages/create/', data),
  getDashboardStats: () => api.get('/tickets/dashboard/stats/'),
};

export default api;