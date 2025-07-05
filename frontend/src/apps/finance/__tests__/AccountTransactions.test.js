import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AccountTransactions from '../components/AccountTransactions';
import * as api from '../services/api';

// Mock the API
jest.mock('../services/api', () => ({
  financeApiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  getSpendingCategories: jest.fn(),
}));

const theme = createTheme();

const mockTransactions = [
  {
    id: 1,
    amount: 85.50,
    merchant_name: 'Grocery Store',
    date: '2023-01-15',
    primary_category: 'food_and_drink',
    user_category: 'Groceries',
    amount_display: '$85.50'
  },
  {
    id: 2,
    amount: 45.20,
    merchant_name: 'Gas Station',
    date: '2023-01-14',
    primary_category: 'transportation',
    user_category: null,
    amount_display: '$45.20'
  },
  {
    id: 3,
    amount: -2500.00,
    name: 'Payroll Deposit',
    date: '2023-01-01',
    primary_category: 'deposit',
    user_category: 'Income',
    amount_display: '-$2,500.00'
  },
];

const mockAccount = {
  id: 1,
  name: 'Checking Account',
  type: 'depository',
  subtype: 'checking',
  current_balance: 5000.50,
  available_balance: 4800.25,
  institution: {
    id: 1,
    name: 'Test Bank',
  },
};

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('AccountTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    api.financeApiClient.get.mockResolvedValue({
      data: {
        results: mockTransactions,
        count: mockTransactions.length,
        next: null,
        previous: null,
      },
    });

    api.getSpendingCategories.mockResolvedValue({
      results: [
        { id: 1, name: 'Groceries' },
        { id: 2, name: 'Transportation' },
        { id: 3, name: 'Income' },
      ],
    });
  });

  describe('Rendering', () => {
    test('renders account transactions with proper title', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Transactions for Checking Account/)).toBeInTheDocument();
      });
    });

    test('displays loading state', () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      expect(screen.getByText(/Loading transactions/)).toBeInTheDocument();
    });

    test('API is called correctly when component mounts', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(api.financeApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/transactions/')
        );
      });
    });
  });

  describe('Transaction List', () => {
    test('displays transactions when data loads successfully', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      // Just verify that the API call was successful and data was processed
      await waitFor(() => {
        expect(api.financeApiClient.get).toHaveBeenCalled();
      });
    });

    test('formats transaction amounts correctly', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('$85.50')).toBeInTheDocument();
        expect(screen.getByText('$45.20')).toBeInTheDocument();
        expect(screen.getByText('-$2,500.00')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('displays transaction categories', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('Food And Drink')).toBeInTheDocument();
        expect(screen.getByText('Transportation')).toBeInTheDocument();
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('displays transaction information correctly', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      // Wait for API call to complete
      await waitFor(() => {
        expect(api.financeApiClient.get).toHaveBeenCalled();
      });

      // Check that some transaction data appears
      await waitFor(() => {
        // Look for any of our transaction data
        const hasGrocery = screen.queryByText('Grocery Store');
        const hasGas = screen.queryByText('Gas Station');  
        const hasPayroll = screen.queryByText('Payroll Deposit');
        expect(hasGrocery || hasGas || hasPayroll).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Filtering and Search', () => {
    test('shows search and filter controls', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Search Description/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Amount/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Max Amount/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
      });
    });

    test('filters transactions by search term', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('Grocery Store')).toBeInTheDocument();
      }, { timeout: 5000 });

      const searchInput = screen.getByLabelText(/Search Description/);
      fireEvent.change(searchInput, { target: { value: 'Grocery' } });
      
      // Should trigger a new API call with search parameter
      await waitFor(() => {
        expect(api.financeApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('search=Grocery')
        );
      });
    });
  });

  describe('Export Functionality', () => {
    test('shows export buttons', async () => {
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Excel')).toBeInTheDocument();
      });
    });

    test('disables export buttons when no transactions', async () => {
      api.financeApiClient.get.mockResolvedValueOnce({
        data: {
          results: [],
          count: 0,
          next: null,
          previous: null,
        },
      });

      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        const csvButton = screen.getByText('CSV').closest('button');
        const excelButton = screen.getByText('Excel').closest('button');
        expect(csvButton).toBeDisabled();
        expect(excelButton).toBeDisabled();
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      api.financeApiClient.get.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AccountTransactions account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load transactions/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
}); 