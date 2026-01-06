import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch current user profile
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return null;
    }

    // Create a timeout promise to prevent infinite loading (3 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 3000)
    );

    try {
      const response = await Promise.race([
        api.get('/api/users/me/'),
        timeoutPromise
      ]);
      setCurrentUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      // On ANY error, clear tokens and stop loading
      clearTokens();
      setCurrentUser(null);
      setLoading(false);
      return null;
    }
  };

  // Clear tokens and auth state
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
  };

  // Set authentication tokens
  const setAuthTokens = async (access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);

    // Set authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;

    // Fetch user data and return the promise
    return await fetchCurrentUser();
  };

  // Initialize auth state on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Login with username/password
  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      const response = await api.post('/api/token/', { username, password });
      const { access, refresh } = response.data;

      // Set tokens and fetch user (setAuthTokens will call fetchCurrentUser)
      await setAuthTokens(access, refresh);

      return { access, refresh };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setError('');
      setLoading(true);
      const response = await api.post('/api/users/register/', userData);

      // Auto-login after registration
      if (response.data.access && response.data.refresh) {
        await setAuthTokens(response.data.access, response.data.refresh);
      }

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    clearTokens();
    setCurrentUser(null);
    setLoading(false);
  };

  // Update user metrics
  const updateMetrics = async (metricsData) => {
    try {
      setError('');

      if (!currentUser?.profile) {
        const userRef = await fetchCurrentUser();
        if (!userRef?.profile) {
          throw new Error("User profile not loaded.");
        }
      }

      const response = await api.patch('/api/users/profile/metrics/', metricsData);

      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...response.data
        }
      };
      setCurrentUser(updatedUser);

      return updatedUser;
    } catch (err) {
      console.error('Metrics update error:', err);
      const errorMessage = err.response?.data?.detail || 'Metrics update failed. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setError('');

      if (!currentUser) {
        await fetchCurrentUser();
        if (!currentUser) {
          throw new Error("User not loaded.");
        }
      }

      const response = await api.patch('/api/users/profile/', profileData);

      const updatedUser = {
        ...currentUser,
        ...response.data
      };

      setCurrentUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.detail || 'Profile update failed. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };


  const value = {
    currentUser,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    updateMetrics,
    updateProfile,
    setAuthTokens,
    fetchCurrentUser,
    // Helper computed properties
    isAuthenticated: !!currentUser,
    userDisplayName: currentUser ? (currentUser.first_name && currentUser.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
      : currentUser.username) : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
