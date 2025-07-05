import api from '../api';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Reset axios create mock
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      defaults: {
        headers: {
          common: {}
        }
      }
    });
  });

  describe('API Instance Configuration', () => {
    test('creates axios instance with correct base configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000',
        timeout: 10000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
    });

    test('uses environment variable for API URL when available', () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'https://api.example.com/api';
      
      // Re-import to pick up new environment variable
      jest.resetModules();
      require('../api');
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com'
        })
      );
      
      // Restore original environment
      process.env.REACT_APP_API_URL = originalEnv;
    });

    test('removes /api suffix from base URL', () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'https://api.example.com/api';
      
      jest.resetModules();
      require('../api');
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com'
        })
      );
      
      process.env.REACT_APP_API_URL = originalEnv;
    });
  });

  describe('Request Interceptor', () => {
    test('adds authorization header when token exists', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } }
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      // Re-import to trigger interceptor setup
      jest.resetModules();
      require('../api');
      
      // Get the request interceptor function
      const requestInterceptor = mockApiInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('accessToken');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    test('does not add authorization header when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } }
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      jest.resetModules();
      require('../api');
      
      const requestInterceptor = mockApiInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - Success Cases', () => {
    test('passes through successful responses', () => {
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } }
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      jest.resetModules();
      require('../api');
      
      const responseInterceptor = mockApiInstance.interceptors.response.use.mock.calls[0][0];
      
      const mockResponse = { data: { success: true } };
      const result = responseInterceptor(mockResponse);
      
      expect(result).toBe(mockResponse);
    });
  });

  describe('Response Interceptor - Error Handling', () => {
    let mockApiInstance;
    let responseErrorHandler;

    beforeEach(() => {
      mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } },
        request: jest.fn()
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      mockedAxios.post.mockResolvedValue({ data: { access: 'new-token' } });
      
      jest.resetModules();
      require('../api');
      
      responseErrorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
    });

    test('handles non-401 errors by rejecting', async () => {
      const error = {
        response: { status: 500 },
        config: {}
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);
    });

    test('handles 401 error with successful token refresh', async () => {
      mockLocalStorage.getItem.mockReturnValue('refresh-token');
      
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };

      mockApiInstance.request.mockResolvedValue({ data: 'success' });
      
      const result = await responseErrorHandler(error);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/token/refresh/', {
        refresh: 'refresh-token'
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
      expect(result).toEqual({ data: 'success' });
    });

    test('handles 401 error without refresh token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    test('handles failed token refresh', async () => {
      mockLocalStorage.getItem.mockReturnValue('refresh-token');
      mockedAxios.post.mockRejectedValue(new Error('Refresh failed'));
      
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };

      await expect(responseErrorHandler(error)).rejects.toEqual(expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    test('prevents infinite retry loops', async () => {
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: true }
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh Queue', () => {
    test('queues concurrent requests during token refresh', async () => {
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } },
        request: jest.fn()
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      // Mock a delayed token refresh
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { access: 'new-token' } }), 100)
        )
      );
      
      mockLocalStorage.getItem.mockReturnValue('refresh-token');
      
      jest.resetModules();
      require('../api');
      
      const responseErrorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
      
      const error1 = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };
      
      const error2 = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };

      // Start both requests simultaneously
      const promise1 = responseErrorHandler(error1);
      const promise2 = responseErrorHandler(error2);
      
      await Promise.all([promise1, promise2]);
      
      // Token refresh should only be called once
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment Configuration', () => {
    test('handles missing environment variables gracefully', () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      delete process.env.REACT_APP_API_URL;
      
      jest.resetModules();
      require('../api');
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:8000'
        })
      );
      
      process.env.REACT_APP_API_URL = originalEnv;
    });

    test('uses correct timeout configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000
        })
      );
    });

    test('includes credentials for session-based features', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    test('handles network errors', async () => {
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } }
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      jest.resetModules();
      require('../api');
      
      const responseErrorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
      
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      
      await expect(responseErrorHandler(networkError)).rejects.toBe(networkError);
    });

    test('handles malformed error responses', async () => {
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } }
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      jest.resetModules();
      require('../api');
      
      const responseErrorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
      
      const malformedError = {
        // Missing response property
        config: {}
      };
      
      await expect(responseErrorHandler(malformedError)).rejects.toBe(malformedError);
    });
  });

  describe('Security', () => {
    test('clears authorization header when tokens are removed', async () => {
      mockLocalStorage.getItem.mockReturnValue('refresh-token');
      mockedAxios.post.mockRejectedValue(new Error('Refresh failed'));
      
      const mockApiInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        },
        defaults: { headers: { common: {} } },
        request: jest.fn()
      };
      
      mockedAxios.create.mockReturnValue(mockApiInstance);
      
      jest.resetModules();
      require('../api');
      
      const responseErrorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: undefined }
      };

      await expect(responseErrorHandler(error)).rejects.toEqual(expect.any(Error));
      expect(mockApiInstance.defaults.headers.common.Authorization).toBeUndefined();
    });
  });
}); 