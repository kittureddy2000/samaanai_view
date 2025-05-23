import '@testing-library/jest-dom';

// Mock modules with modern ES imports to avoid import issues
jest.mock('axios', () => {
  const mockAxios = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    defaults: {
      headers: { common: {} }
    }
  };
  
  return {
    create: jest.fn(() => mockAxios),
    ...mockAxios
  };
});

// Mock date-fns to avoid time-related inconsistencies in tests
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: jest.fn((date, format) => '2023-01-01'),
    addDays: jest.fn(date => date),
    subDays: jest.fn(date => date),
    parseISO: jest.fn(dateString => new Date('2023-01-01')),
  };
});

// Mock sessionStorage and localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Suppress React 18 console warnings during tests
const originalError = console.error;
console.error = (...args) => {
  if (
    /Warning.*not wrapped in act/.test(args[0]) ||
    /ReactDOM.render is no longer supported/.test(args[0])
  ) {
    return;
  }
  originalError(...args);
};
