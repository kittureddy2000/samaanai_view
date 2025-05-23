// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api'; // Make sure api service is correctly defined

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // Define setError state

  // Function to fetch user profile if token exists
  const fetchUserProfile = async () => {
      try {
          // Use the correct path relative to baseURL which already includes /api
          const response = await api.get('users/profile/');
          setCurrentUser(response.data);
      } catch (err) {
          console.error('Failed to fetch profile:', err);
          // Clear token if profile fetch fails (e.g., token expired)
          localStorage.removeItem('authToken'); // Assuming token is stored here
          setCurrentUser(null);
      } finally {
          setLoading(false);
      }
  };

  // Add this function to your AuthContext component (before the useEffect)
  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      // Now we need to use the correct API URL structure with the updated baseURL
      const baseUrl = process.env.REACT_APP_API_URL ? 
        process.env.REACT_APP_API_URL.replace(/\/api$/, '') : 
        'http://localhost:8000';
      
      const response = await api.get('api/users/me/');
      setCurrentUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      setCurrentUser(null);
      setLoading(false);
      // Clear token if unauthorized
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
      }
      return null;
    }
  };

  // Check for existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser(); // Use fetchCurrentUser instead of fetchUserProfile
    } else {
      setLoading(false);
    }
  }, []);


  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      // Update to use the correct token endpoint
      const response = await api.post('api/token/', { username, password });
      const { access, refresh } = response.data;
      
      // Return tokens to be handled by the calling component
      return { access, refresh };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw err; // Re-throw error for component handling
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    console.log('AuthContext register received userData:', JSON.stringify(userData)); 

    console.log('Making API call to users/register/');
    
    try {
      // Use the received userData directly
      const payload = userData;
      
      console.log('Final constructed payload before API call:', JSON.stringify(payload)); 

      // Path is correct relative to baseURL which already includes /api
      const response = await api.post('api/users/register/', payload); 
      console.log('API registration response:', response.data);
      return response.data;

    } catch (error) {
      console.log('API Registration error in AuthContext:', error);
      if (error.response && error.response.data) {
        console.log('Error response data:', JSON.stringify(error.response.data)); 
      }
      throw error; 
    }
  };

  const logout = () => {
    console.log('Logging out...');
    setAuthTokens(null, null); // Call with null to clear tokens and auth header
    setCurrentUser(null); // Clear user state
    // Optional: redirect to login
    // navigate('/login'); 
  };

  // Update user metrics (weight, metabolic rate, etc.)
  const updateMetrics = async (metricsData) => {
      try {
        setError('');
        // Make sure currentUser and profile exist before patching
        let userRef = currentUser;
        if (!userRef || !userRef.profile) {
            userRef = await fetchCurrentUser();
            if (!userRef || !userRef.profile) {
                throw new Error("User profile not loaded.");
            }
        }
        // Path is correct relative to baseURL which already includes /api
        const response = await api.patch('api/users/profile/metrics/', metricsData);

        // Update stored user data correctly
        const updatedUser = {
          ...userRef,
          profile: {
            ...userRef.profile,
            ...response.data // Merge metrics update response
          }
        };
        setCurrentUser(updatedUser); // Update state

        return updatedUser;
      } catch (err) {
        console.error('Metrics update error:', err);
        let errorMessage = 'Metrics update failed. Please try again.';
         if (err.response && err.response.data) {
            const errorData = err.response.data;
            errorMessage = Object.entries(errorData)
                .map(([key, value]) => {
                  // Check if value is an array before using join
                  if (Array.isArray(value)) {
                    return `${key}: ${value.join(', ')}`;
                  } else {
                    return `${key}: ${value}`;
                  }
                })
                .join('\n');
        }
        setError(errorMessage);
        throw err;
      }
    };

  // Update user profile information
  const updateProfile = async (profileData) => {
    try {
      setError('');
      // Make sure currentUser exists before patching
      if (!currentUser) {
        await fetchCurrentUser();
        if (!currentUser) {
          throw new Error("User not loaded.");
        }
      }
      
      // Path is correct relative to baseURL which already includes /api
      const response = await api.patch('api/users/profile/', profileData);
      
      // Update stored user data
      const updatedUser = {
        ...currentUser,
        ...response.data // Merge profile update response
      };
      
      setCurrentUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Profile update error:', err);
      let errorMessage = 'Profile update failed. Please try again.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        errorMessage = Object.entries(errorData)
          .map(([key, value]) => {
            // Check if value is an array before using join
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            } else {
              return `${key}: ${value}`;
            }
          })
          .join('\n');
      }
      setError(errorMessage);
      throw err;
    }
  };

  // Rename or create a function to handle both tokens
  const setAuthTokens = (access, refresh) => {
    if (access && refresh) {
      console.log('Setting access and refresh tokens...');
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      // Set the initial Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      // Fetch user details now that tokens are set
      fetchCurrentUser(); 
    } else {
      console.log('Clearing tokens...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
       // Optionally set currentUser to null here if needed immediately
       // setCurrentUser(null); 
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
    setAuthTokens, // Use the new function name
    fetchCurrentUser
  };

  // Render children only when not loading initially, or handle loading state in consumers
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}