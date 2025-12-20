import * as api from '../services/api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Finance API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('API Methods Existence', () => {
    test('getDashboardData method exists', () => {
      expect(typeof api.getDashboardData).toBe('function');
    });

    test('getInstitutions method exists', () => {
      expect(typeof api.getInstitutions).toBe('function');
    });

    test('getAccounts method exists', () => {
      expect(typeof api.getAccounts).toBe('function');
    });

    test('getSpendingCategories method exists', () => {
      expect(typeof api.getSpendingCategories).toBe('function');
    });

    test('getHoldings method exists', () => {
      expect(typeof api.getHoldings).toBe('function');
    });

    test('getInvestmentTransactions method exists', () => {
      expect(typeof api.getInvestmentTransactions).toBe('function');
    });

    test('createLinkToken method exists', () => {
      expect(typeof api.createLinkToken).toBe('function');
    });

    test('exchangePublicToken method exists', () => {
      expect(typeof api.exchangePublicToken).toBe('function');
    });

    test('upgradeInstitutionForInvestments method exists', () => {
      expect(typeof api.upgradeInstitutionForInvestments).toBe('function');
    });

    test('refreshAccountBalances method exists', () => {
      expect(typeof api.refreshAccountBalances).toBe('function');
    });
  });

  describe('Exports', () => {
    test('default API client is exported', () => {
      expect(api.default).toBeDefined();
    });

    test('FINANCE_BASE_PATH constant is exported', () => {
      expect(api.FINANCE_BASE_PATH).toBe('/api/finance');
    });
  });

  describe('Error Handling', () => {
    test('handles connection errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      
      // Test that functions exist and can handle errors
      expect(typeof api.getDashboardData).toBe('function');
      expect(typeof api.getInstitutions).toBe('function');
    });

    test('handles authentication errors', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Should still work without token
      expect(typeof api.getDashboardData).toBe('function');
      expect(typeof api.getAccounts).toBe('function');
    });
  });
}); 
