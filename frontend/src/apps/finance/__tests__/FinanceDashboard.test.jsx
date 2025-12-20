import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FinanceDashboard from '../components/FinanceDashboard';
import * as api from '../services/api';

// Mock the API
jest.mock('../services/api');

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data, options }) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Bar: ({ data, options }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Line: ({ data, options }) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Pie: ({ data, options }) => (
    <div data-testid="pie-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

const theme = createTheme();

const mockAccounts = [
  {
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
  },
  {
    id: 2,
    name: 'Savings Account',
    type: 'depository',
    subtype: 'savings',
    current_balance: 15000.75,
    available_balance: 15000.75,
    institution: {
      id: 1,
      name: 'Test Bank',
    },
  },
];

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('FinanceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations using correct API method names
    api.getInstitutions.mockResolvedValue({
      results: [
        {
          id: 1,
          name: 'Test Bank',
          accounts: mockAccounts,
        },
      ],
    });

    api.getAccounts.mockResolvedValue({
      results: mockAccounts,
    });

    api.getDashboardData.mockResolvedValue({
      total_balance: 20001.25,
      recent_transactions: [
        {
          id: 1,
          amount: 85.50,
          description: 'Grocery Store',
          date: '2023-01-15',
          account_id: 1,
          category: 'Food and Drink',
          merchant_name: 'Grocery Store',
          primary_category: 'food_and_drink'
        },
        {
          id: 2,
          amount: 45.20,
          description: 'Gas Station',
          date: '2023-01-14',
          account_id: 1,
          category: 'Transportation',
          merchant_name: 'Gas Station',
          primary_category: 'transportation'
        },
      ],
      spending_by_category: [
        { primary_category: 'food_and_drink', total: 450.75 },
        { primary_category: 'transportation', total: 250.30 },
      ],
      net_worth_trend: [
        { date: '2023-01-01', net_worth: 20000 },
        { date: '2023-01-15', net_worth: 20001.25 },
      ]
    });

    api.getSpendingCategories.mockResolvedValue({
      results: [
        { id: 1, name: 'Food and Drink' },
        { id: 2, name: 'Transportation' },
        { id: 3, name: 'Shopping' },
      ],
    });
  });

  describe('Basic Rendering', () => {
    test('renders dashboard loading state', () => {
      renderWithProviders(<FinanceDashboard accounts={[]} loading={true} />);
      expect(screen.getByText(/Loading dashboard/)).toBeInTheDocument();
    });

    test('renders dashboard with data', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/Spending by Month/)).toBeInTheDocument();
      });
    });

    test('displays filter controls', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Institution/)).toBeInTheDocument();
      });
    });
  });

  describe('Charts Display', () => {
    test('renders spending charts when data is available', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        // Should have bar charts for monthly spending
        const barCharts = screen.getAllByTestId('bar-chart');
        expect(barCharts.length).toBeGreaterThan(0);
      });
    });

    test('renders pie chart for category breakdown', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Transactions Table', () => {
    test('displays recent transactions section', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Recent Transactions/)).toBeInTheDocument();
      });
    });

    test('shows transaction filter controls', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Search Description/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Amount/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Max Amount/)).toBeInTheDocument();
      });
    });

    test('displays export buttons', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Excel')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles dashboard API errors gracefully', async () => {
      api.getDashboardData.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        // Should still show the dashboard structure even if data fails to load
        expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      });
    });

    test('handles institutions API errors gracefully', async () => {
      api.getInstitutions.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        // Should still render basic structure
        expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      });
    });
  });

  describe('Top Spending Categories', () => {
    test('displays top spending categories section', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Top Spending Categories/)).toBeInTheDocument();
      });
    });
  });

  describe('Category Breakdown', () => {
    test('displays category breakdown section', async () => {
      renderWithProviders(<FinanceDashboard accounts={mockAccounts} loading={false} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Category Breakdown/)).toBeInTheDocument();
      });
    });
  });
}); 