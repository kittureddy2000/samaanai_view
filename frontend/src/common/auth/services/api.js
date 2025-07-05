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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${api.defaults.baseURL}/api/token/refresh/`, {
            refresh: refreshToken
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          
          // Update the default header for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          processQueue(null, access);
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization'];
          
          processQueue(refreshError, null);
          
          // Redirect to login page
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, clear everything and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;