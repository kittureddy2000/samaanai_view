import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import AccountSettings from '../AccountSettings';

// Create MUI theme
const muiTheme = createTheme();

// Mock styled-components theme
const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    border: '#dee2e6',
    neutral: '#6c757d'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 4px 8px rgba(0,0,0,0.15)',
    large: '0 8px 16px rgba(0,0,0,0.2)'
  },
  breakpoints: {
    xs: '480px',
    sm: '768px',
    md: '992px',
    lg: '1200px'
  }
};

// Mock data for testing
const mockAccounts = [
  {
    id: 1,
    name: 'Chase Checking',
    official_name: 'Chase Total Checking',
    institution: { name: 'Chase Bank' },
    type: 'depository',
    subtype: 'checking',
    balance: 2500.50
  },
  {
    id: 2,
    name: 'Wells Fargo Savings',
    official_name: 'Wells Fargo Way2Save',
    institution: { name: 'Wells Fargo' },
    type: 'depository',
    subtype: 'savings',
    balance: 15000.00
  },
  {
    id: 3,
    name: 'Discover Credit Card',
    official_name: 'Discover it Cash Back',
    institution: { name: 'Discover' },
    type: 'credit',
    subtype: 'credit card',
    balance: -1250.75
  }
];

const defaultProps = {
  accounts: mockAccounts,
  loading: false,
  onRefreshAccounts: jest.fn(),
  onAccountUpdate: jest.fn()
};

const renderWithProviders = (ui, props = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider theme={theme}>
        {React.cloneElement(ui, mergedProps)}
      </ThemeProvider>
    </MuiThemeProvider>
  );
};

describe('AccountSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders account settings page with accounts', () => {
    renderWithProviders(<AccountSettings />);
    
    // Check for main headings
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    expect(screen.getByText('Account Details')).toBeInTheDocument();
    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
    
    // Check for account data
    expect(screen.getByText('Chase Checking')).toBeInTheDocument();
    expect(screen.getByText('Wells Fargo Savings')).toBeInTheDocument();
    expect(screen.getByText('Discover Credit Card')).toBeInTheDocument();
  });

  test('displays account summary correctly', () => {
    renderWithProviders(<AccountSettings />);
    
    // Check summary cards
    expect(screen.getByText('Total Accounts')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total accounts count
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
  });

  test('displays account balances correctly', () => {
    renderWithProviders(<AccountSettings />);
    
    // Check positive balances
    expect(screen.getByText('$2,500.50')).toBeInTheDocument();
    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
    
    // Check negative balance (credit card)
    expect(screen.getByText('$1,250.75')).toBeInTheDocument();
  });

  test('shows institution and account type information', () => {
    renderWithProviders(<AccountSettings />);
    
    // Check institutions
    expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    expect(screen.getByText('Wells Fargo')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
    
    // Check account types
    expect(screen.getByText('depository')).toBeInTheDocument();
    expect(screen.getByText('credit')).toBeInTheDocument();
  });

  test('handles refresh account action', async () => {
    const mockOnRefreshAccounts = jest.fn().mockResolvedValue();
    const mockOnAccountUpdate = jest.fn();
    
    renderWithProviders(<AccountSettings />, {
      onRefreshAccounts: mockOnRefreshAccounts,
      onAccountUpdate: mockOnAccountUpdate
    });
    
    // Find and click refresh button for first account
    const refreshButtons = screen.getAllByTitle('Refresh Account');
    fireEvent.click(refreshButtons[0]);
    
    await waitFor(() => {
      expect(mockOnRefreshAccounts).toHaveBeenCalledTimes(1);
      expect(mockOnAccountUpdate).toHaveBeenCalledTimes(1);
    });
  });

  test('handles delete account confirmation', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    renderWithProviders(<AccountSettings />);
    
    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Remove Account');
    fireEvent.click(deleteButtons[0]);
    
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this account? This action cannot be undone.'
    );
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  test('handles empty accounts list', () => {
    renderWithProviders(<AccountSettings />, { accounts: [] });
    
    // Should still render main structure
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    expect(screen.getByText('Account Details')).toBeInTheDocument();
    
    // Summary should show 0 accounts
    expect(screen.getByText('Total Accounts')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    renderWithProviders(<AccountSettings />, { loading: true });
    
    // Component should still render with loading prop
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
  });

  test('displays status chips correctly', () => {
    renderWithProviders(<AccountSettings />);
    
    // All accounts should show as connected by default
    const connectedChips = screen.getAllByText('Connected');
    expect(connectedChips).toHaveLength(3);
  });

  test('shows add account button', () => {
    renderWithProviders(<AccountSettings />);
    
    expect(screen.getByText('Link New Account')).toBeInTheDocument();
  });

  test('displays sync settings section', () => {
    renderWithProviders(<AccountSettings />);
    
    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
    expect(screen.getByText('Control how often your accounts are synchronized and updated.')).toBeInTheDocument();
    expect(screen.getByText('Sync Now')).toBeInTheDocument();
    expect(screen.getByText('Auto-sync Settings')).toBeInTheDocument();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  test('handles account with missing optional fields', () => {
    const accountsWithMissingFields = [
      {
        id: 1,
        // Missing name and official_name
        institution: { name: 'Test Bank' },
        type: 'depository',
        // Missing balance
      }
    ];
    
    renderWithProviders(<AccountSettings />, { accounts: accountsWithMissingFields });
    
    // Should handle missing fields gracefully
    expect(screen.getByText('Unknown Account')).toBeInTheDocument();
    expect(screen.getByText('Test Bank')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  test('handles account with missing institution', () => {
    const accountsWithMissingInstitution = [
      {
        id: 1,
        name: 'Test Account',
        type: 'depository',
        balance: 1000
      }
    ];
    
    renderWithProviders(<AccountSettings />, { accounts: accountsWithMissingInstitution });
    
    expect(screen.getByText('Test Account')).toBeInTheDocument();
    expect(screen.getByText('Unknown Institution')).toBeInTheDocument();
  });

  test('calls onAccountUpdate when provided', async () => {
    const mockOnAccountUpdate = jest.fn();
    const mockOnRefreshAccounts = jest.fn().mockResolvedValue();
    
    renderWithProviders(<AccountSettings />, {
      onRefreshAccounts: mockOnRefreshAccounts,
      onAccountUpdate: mockOnAccountUpdate
    });
    
    const refreshButtons = screen.getAllByTitle('Refresh Account');
    fireEvent.click(refreshButtons[0]);
    
    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalled();
    });
  });

  test('handles refresh account error', async () => {
    const mockOnRefreshAccounts = jest.fn().mockRejectedValue(new Error('Refresh failed'));
    
    renderWithProviders(<AccountSettings />, {
      onRefreshAccounts: mockOnRefreshAccounts
    });
    
    const refreshButtons = screen.getAllByTitle('Refresh Account');
    fireEvent.click(refreshButtons[0]);
    
    // Should handle error gracefully without crashing
    await waitFor(() => {
      expect(mockOnRefreshAccounts).toHaveBeenCalled();
    });
  });
}); 