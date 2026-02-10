import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        setToken(storedToken);
        try {
          await fetchUser();
        } catch (error) {
          console.log('Auto-login failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      
      const { access, refresh, user } = response.data;
      
      // Store tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      
      setToken(access);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Login failed' } 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Add password confirmation
      const registerData = {
        ...userData,
        password2: userData.password
      };
      
      const response = await authAPI.register(registerData);
      
      // Auto-login after registration
      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        setToken(response.data.access);
        setUser(response.data.user);
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Registration failed' } 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    userType: user?.user_type,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};