import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { AuthContext } from '../../apps/calorie-tracker/contexts/AuthContext';
import nutritionService from '../../apps/calorie-tracker/services/nutritionService';
import * as financeApi from '../../apps/finance/services/api';

// Mock services
jest.mock('../../apps/calorie-tracker/services/nutritionService', () => ({
  __esModule: true,
  default: {
    getDailyReport: jest.fn(),
    getWeeklyReport: jest.fn(),
    getWeightHistory: jest.fn(),
    addOrUpdateMealEntry: jest.fn(),
    addOrUpdateExerciseEntry: jest.fn(),
    addOrUpdateWeightEntry: jest.fn(),
    deleteMealEntry: jest.fn(),
    deleteExerciseEntry: jest.fn(),
    getMonthlyReport: jest.fn(),
    getYearlyReport: jest.fn(),
  }
}));
jest.mock('../../apps/finance/services/api');

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
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
}));

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, customInput, ...props }) {
    const Component = customInput || 'input';
    return (
      <Component
        data-testid="date-picker"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange && onChange(new Date(e.target.value))}
        {...props}
      />
    );
  };
});

const styledTheme = {
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
    neutral: '#6c757d',
  },
  fonts: {
    body: 'Arial, sans-serif',
  },
  borderRadius: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem',
    circle: '50%',
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.1)',
    medium: '0 4px 6px rgba(0,0,0,0.1)',
    large: '0 10px 15px rgba(0,0,0,0.1)',
  },
  breakpoints: {
    xs: '576px',
    sm: '768px',
    md: '992px',
    lg: '1200px',
  },
};

const muiTheme = createTheme();

const mockAuthContext = {
  currentUser: {
    id: 1,
    username: 'testuser',
    first_name: 'Test',
    email: 'test@example.com',
    profile: {
      metabolic_rate: 2000,
      weight_loss_goal: 0.5,
    },
  },
  login: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  updateMetrics: jest.fn(),
  loading: false,
  error: null,
};

const renderApp = (initialRoute = '/', authContext = mockAuthContext) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <MuiThemeProvider theme={muiTheme}>
        <ThemeProvider theme={styledTheme}>
          <AuthContext.Provider value={authContext}>
            <App />
          </AuthContext.Provider>
        </ThemeProvider>
      </MuiThemeProvider>
    </MemoryRouter>
  );
};

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup nutrition service mocks
    nutritionService.getDailyReport.mockResolvedValue({
      date: '2023-01-01',
      total_food_calories: 1500,
      total_exercise_calories: 300,
      meals: [
        {
          id: 1,
          meal_type: 'breakfast',
          description: 'Oatmeal',
          calories: 350,
          created_at: '2023-01-01T08:00:00Z',
        },
      ],
      exercises: [
        {
          id: 1,
          description: 'Running',
          calories_burned: 300,
          duration_minutes: 30,
          created_at: '2023-01-01T18:00:00Z',
        },
      ],
    });

    nutritionService.getWeeklyReport.mockResolvedValue({
      daily_summaries: [
        {
          date: '2023-01-01',
          total_food_calories: 1500,
          total_exercise_calories: 300,
          net_calories: 1200,
        },
      ],
    });

    nutritionService.getWeightHistory.mockResolvedValue([
      { id: 1, weight: 70.5, date: '2023-01-01' },
    ]);

    nutritionService.addOrUpdateMealEntry.mockResolvedValue({ id: 2 });
    nutritionService.addOrUpdateExerciseEntry.mockResolvedValue({ id: 2 });
    nutritionService.addOrUpdateWeightEntry.mockResolvedValue({ id: 2 });

    // Setup finance service mocks
    financeApi.getInstitutions.mockResolvedValue({
      results: [
        {
          id: 1,
          name: 'Test Bank',
          accounts: [
            {
              id: 1,
              name: 'Checking Account',
              type: 'depository',
              current_balance: 5000.50,
              available_balance: 4800.25,
            },
          ],
        },
      ],
    });

    financeApi.getTransactions.mockResolvedValue({
      results: [
        {
          id: 1,
          amount: -85.50,
          description: 'Grocery Store',
          date: '2023-01-15',
          category: 'Food and Drink',
        },
      ],
    });
  });

  describe('Navigation and Routing', () => {
    test('renders landing page by default', () => {
      renderApp('/');
      expect(screen.getByText(/Welcome to Samaanai/)).toBeInTheDocument();
    });

    test('navigates to nutrition dashboard', async () => {
      renderApp('/nutrition');
      
      await waitFor(() => {
        expect(screen.getByText(/Hello, Test!/)).toBeInTheDocument();
        expect(screen.getByText(/Let's track your nutrition today/)).toBeInTheDocument();
      });
    });

    test('navigates to finance app', async () => {
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByText('Financial Overview')).toBeInTheDocument();
      });
    });

    test('navigation between apps works correctly', async () => {
      renderApp('/nutrition');
      
      // Start in nutrition app
      await waitFor(() => {
        expect(screen.getByText(/Hello, Test!/)).toBeInTheDocument();
      });
      
      // Navigate to finance app (would need navigation components to test this)
      // This would require implementing actual navigation in the test
    });
  });

  describe('Nutrition App Integration', () => {
    test('complete calorie tracking workflow', async () => {
      renderApp('/nutrition/daily');
      
      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
      });
      
      // Add breakfast calories
      const breakfastInput = screen.getByLabelText(/Breakfast/);
      fireEvent.change(breakfastInput, { target: { value: '400' } });
      
      // Add exercise calories
      const exerciseInput = screen.getByLabelText(/Exercise/);
      fireEvent.change(exerciseInput, { target: { value: '250' } });
      
      // Save entries
      const saveButton = screen.getByText('Save All Entries');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            meal_type: 'breakfast',
            calories: 400,
          })
        );
        
        expect(nutritionService.addOrUpdateExerciseEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            calories_burned: 250,
          })
        );
      });
    });

    test('dashboard to daily entry navigation', async () => {
      renderApp('/nutrition');
      
      await waitFor(() => {
        expect(screen.getByText('Log Calories')).toBeInTheDocument();
      });
      
      // Click on Log Calories action card
      const logCaloriesCard = screen.getByText('Log Calories').closest('a');
      expect(logCaloriesCard).toHaveAttribute('href', '/daily');
    });

    test('weight tracking from dashboard', async () => {
      renderApp('/nutrition');
      
      await waitFor(() => {
        const weightInput = screen.getByPlaceholderText('Weight (kg)');
        const saveButton = screen.getByText('Save Weight');
        
        fireEvent.change(weightInput, { target: { value: '69.5' } });
        fireEvent.click(saveButton);
        
        expect(nutritionService.addOrUpdateWeightEntry).toHaveBeenCalledWith({
          weight: 69.5,
          date: expect.any(String),
        });
      });
    });

    test('displays charts with real data', async () => {
      renderApp('/nutrition');
      
      await waitFor(() => {
        const charts = screen.getAllByTestId('line-chart');
        expect(charts.length).toBeGreaterThan(0);
        
        // Check that chart data includes our mock data
        const chartData = screen.getAllByTestId('chart-data');
        expect(chartData.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Finance App Integration', () => {
    test('displays financial overview with account data', async () => {
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByText('Financial Overview')).toBeInTheDocument();
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
        expect(screen.getByText(/\$5,000\.50/)).toBeInTheDocument();
      });
    });

    test('shows transaction history', async () => {
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByText('Grocery Store')).toBeInTheDocument();
        expect(screen.getByText(/-\$85\.50/)).toBeInTheDocument();
      });
    });

    test('calculates net worth correctly', async () => {
      renderApp('/finance');
      
      await waitFor(() => {
        // With our mock data: assets (5000.50) - liabilities (0) = 5000.50
        expect(screen.getByText(/Net Worth/)).toBeInTheDocument();
        expect(screen.getByText(/\$5,000\.50/)).toBeInTheDocument();
      });
    });

    test('renders financial charts', async () => {
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('handles nutrition API errors gracefully', async () => {
      nutritionService.getDailyReport.mockRejectedValue(new Error('API Error'));
      
      renderApp('/nutrition');
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
      });
    });

    test('handles finance API errors gracefully', async () => {
      financeApi.getInstitutions.mockRejectedValue(new Error('Finance API Error'));
      
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByText(/No accounts connected/)).toBeInTheDocument();
      });
    });

    test('shows appropriate error states', async () => {
      nutritionService.getDailyReport.mockRejectedValue(new Error('Network error'));
      
      renderApp('/nutrition/daily');
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch daily data/)).toBeInTheDocument();
      });
    });
  });

  describe('User Authentication Integration', () => {
    test('handles unauthenticated user', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        currentUser: null,
      };
      
      renderApp('/nutrition', unauthenticatedContext);
      
      // Should redirect to login or show authentication prompt
      // (Implementation depends on your auth flow)
    });

    test('uses user profile data correctly', async () => {
      renderApp('/nutrition');
      
      await waitFor(() => {
        // Should show net calories calculated with user's metabolic rate
        expect(screen.getByText('550')).toBeInTheDocument(); // Net calories
      });
    });

    test('shows setup prompts for incomplete profiles', async () => {
      const incompleteProfileContext = {
        ...mockAuthContext,
        currentUser: {
          ...mockAuthContext.currentUser,
          profile: {
            metabolic_rate: null,
            weight_loss_goal: null,
          },
        },
      };
      
      renderApp('/nutrition', incompleteProfileContext);
      
      await waitFor(() => {
        expect(screen.getByText(/Set up metabolic rate/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    test('adapts to mobile viewport in nutrition app', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderApp('/nutrition/daily');
      
      await waitFor(() => {
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
        expect(screen.getByTestId('date-picker')).toBeInTheDocument();
      });
    });

    test('adapts to mobile viewport in finance app', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderApp('/finance');
      
      await waitFor(() => {
        expect(screen.getByText('Financial Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence Integration', () => {
    test('saves and retrieves calorie data correctly', async () => {
      renderApp('/nutrition/daily');
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        fireEvent.change(breakfastInput, { target: { value: '450' } });
        
        const saveButton = screen.getByText('Save All Entries');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            calories: 450,
            meal_type: 'breakfast',
          })
        );
      });
    });

    test('retrieves and displays existing data', async () => {
      renderApp('/nutrition/daily');
      
      await waitFor(() => {
        // Should display existing breakfast calories from mock
        expect(screen.getByDisplayValue('350')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-App Functionality', () => {
    test('maintains separate state between apps', async () => {
      // Start in nutrition app
      renderApp('/nutrition');
      
      await waitFor(() => {
        expect(nutritionService.getDailyReport).toHaveBeenCalled();
      });
      
      // Navigate to finance app would require router navigation
      // This tests that each app loads its own data independently
      expect(financeApi.getInstitutions).not.toHaveBeenCalled();
    });

    test('both apps can coexist without conflicts', async () => {
      // This test ensures that importing both apps doesn't cause conflicts
      expect(() => {
        renderApp('/nutrition');
      }).not.toThrow();
      
      expect(() => {
        renderApp('/finance');
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    test('renders quickly with large datasets', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        meal_type: 'breakfast',
        calories: 300 + i,
        description: `Meal ${i}`,
      }));
      
      nutritionService.getDailyReport.mockResolvedValue({
        date: '2023-01-01',
        total_food_calories: 30000,
        total_exercise_calories: 0,
        meals: largeMockData,
        exercises: [],
      });
      
      const startTime = performance.now();
      renderApp('/nutrition');
      
      await waitFor(() => {
        expect(screen.getByText(/Hello, Test!/)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should render within 5 seconds
    });
  });
}); 