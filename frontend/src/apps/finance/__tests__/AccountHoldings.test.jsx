import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AccountHoldings from '../components/AccountHoldings';
import * as api from '../services/api';

// Mock the API
jest.mock('../services/api', () => ({
  getHoldings: jest.fn(),
}));

const theme = createTheme();

const mockHoldings = [
  {
    id: 1,
    security: {
      ticker_symbol: 'AAPL',
      name: 'Apple Inc.',
    },
    quantity: 10,
    institution_price: 150.25,
    institution_value: 1502.50,
    unrealized_gain_loss: 52.50,
    unrealized_gain_loss_percent: 3.62,
    quantity_display: '10',
    value_display: '$1,502.50',
    gain_loss_display: '+$52.50',
    gain_loss_percent_display: '+3.62%'
  },
  {
    id: 2,
    security: {
      ticker_symbol: 'GOOGL',
      name: 'Alphabet Inc.',
    },
    quantity: 5,
    institution_price: 2500.75,
    institution_value: 12503.75,
    unrealized_gain_loss: -250.50,
    unrealized_gain_loss_percent: -1.96,
    quantity_display: '5',
    value_display: '$12,503.75',
    gain_loss_display: '-$250.50',
    gain_loss_percent_display: '-1.96%'
  },
];

const mockAccount = {
  id: 1,
  name: 'Investment Account',
  type: 'investment',
  subtype: 'brokerage',
  current_balance: 14006.25,
  available_balance: 14006.25,
  institution: {
    id: 1,
    name: 'Investment Firm',
  },
};

const mockSummary = {
  total_value: 14006.25,
  total_value_display: '$14,006.25',
  total_gain_loss: -198.00,
  total_gain_loss_display: '-$198.00',
  holdings_count: 2
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

describe('AccountHoldings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    api.getHoldings.mockResolvedValue({
      holdings: mockHoldings,
      summary: mockSummary,
    });
  });

  describe('Rendering', () => {
    test('renders account holdings with proper title', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Portfolio Holdings - Investment Account/)).toBeInTheDocument();
      });
    });

    test('displays loading state', () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      expect(screen.getByText(/Loading holdings/)).toBeInTheDocument();
    });

    test('shows empty state when no holdings', async () => {
      api.getHoldings.mockResolvedValueOnce({
        holdings: [],
        summary: { holdings_count: 0 },
      });

      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText(/No holdings found for the selected criteria/)).toBeInTheDocument();
      });
    });
  });

  describe('Portfolio Summary', () => {
    test('displays portfolio summary information', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument();
        expect(screen.getByText('$14,006.25')).toBeInTheDocument();
        expect(screen.getByText('Total Gain/Loss')).toBeInTheDocument();
        expect(screen.getByText('-$198.00')).toBeInTheDocument();
        expect(screen.getByText('Holdings Count')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Holdings List', () => {
    test('displays holdings in table', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('GOOGL')).toBeInTheDocument();
        expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
      });
    });

    test('displays holding quantities and values correctly', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // AAPL quantity
        expect(screen.getByText('5')).toBeInTheDocument(); // GOOGL quantity
        expect(screen.getByText('$1,502.50')).toBeInTheDocument(); // AAPL value
        expect(screen.getByText('$12,503.75')).toBeInTheDocument(); // GOOGL value
      });
    });

    test('displays gain/loss information correctly', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('+$52.50')).toBeInTheDocument(); // AAPL gain
        expect(screen.getByText('+3.62%')).toBeInTheDocument(); // AAPL gain %
        expect(screen.getByText('-$250.50')).toBeInTheDocument(); // GOOGL loss
        expect(screen.getByText('-1.96%')).toBeInTheDocument(); // GOOGL loss %
      });
    });
  });

  describe('Filtering and Search', () => {
    test('shows search and filter controls', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Search Symbol\/Name/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Value/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Max Value/)).toBeInTheDocument();
      });
    });

    test('filters holdings by search term', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/Search Symbol\/Name/);
      fireEvent.change(searchInput, { target: { value: 'Apple' } });
      
      await waitFor(() => {
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.queryByText('Alphabet Inc.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    test('shows export buttons', async () => {
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Excel')).toBeInTheDocument();
      });
    });

    test('disables export buttons when no holdings', async () => {
      api.getHoldings.mockResolvedValueOnce({
        holdings: [],
        summary: { holdings_count: 0 },
      });

      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        const csvButton = screen.getByText('CSV').closest('button');
        const excelButton = screen.getByText('Excel').closest('button');
        expect(csvButton).toBeDisabled();
        expect(excelButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles holdings API errors gracefully', async () => {
      api.getHoldings.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AccountHoldings account={mockAccount} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load holdings/)).toBeInTheDocument();
      });
    });
  });
}); 