import axios from 'axios';

// Flag to prevent multiple concurrent token refresh attempts
let isRefreshing = false;
// Queue to hold failed requests while token is refreshing
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Create base API instance with environment-based configuration
const api = axios.create({
  // Read API URL from environment variables with fallback values
  // In React, environment variables must be prefixed with REACT_APP_
  // Important: Don't include the /api prefix here as it's included in the URL paths
  baseURL: process.env.REACT_APP_API_URL ? 
    process.env.REACT_APP_API_URL.replace(/\/api$/, '') : 
    'http://localhost:8000',
  timeout: 10000, // 10 seconds timeout
  withCredentials: true, // Include cookies for session-based features like WebAuthn
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor for adding auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get access token from localStorage if it exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        // If token is already refreshing, queue the request
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest); // Retry original request with new token
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true; // Mark request as retried
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        // Optional: Redirect to login page
        // window.location.href = '/login';
        return Promise.reject(error);
      }

      // Attempt token refresh
      try {
        const refreshResponse = await axios.post('/api/token/refresh/', {
          refresh: refreshToken,
        });

        // Update tokens
        const newAccessToken = refreshResponse.data.access;
        localStorage.setItem('accessToken', newAccessToken);
        
        // Update the authorization header for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Retry the original request with the new token
        error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        processQueue(refreshError, null); // Reject queued requests
        isRefreshing = false;
        // Optional: Redirect to login or handle logout
        // window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
         isRefreshing = false;
      }
    }

    // For errors other than 401, just reject
    return Promise.reject(error);
  }
);

export default api;