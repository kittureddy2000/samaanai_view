import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import Dashboard from '../pages/Dashboard';
import { AuthContext } from '../contexts/AuthContext';
import nutritionService from '../services/nutritionService';

// Mock the services
jest.mock('../services/nutritionService');

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, customInput, ...props }) {
    return (
      <input
        data-testid="date-picker"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange && onChange(new Date(e.target.value))}
        {...props}
      />
    );
  };
});

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

const renderWithProviders = (component, authContext = mockAuthContext) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={authContext}>
          {component}
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
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
      { id: 2, weight: 70.0, date: '2023-01-02' },
    ]);

    nutritionService.addOrUpdateWeightEntry.mockResolvedValue({
      id: 3,
      weight: 69.8,
      date: '2023-01-03',
    });
  });

  describe('Rendering', () => {
    test('renders dashboard with welcome message', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Hello, Test!/)).toBeInTheDocument();
        expect(screen.getByText(/Let's track your nutrition today/)).toBeInTheDocument();
      });
    });

    test('displays loading state initially', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/Loading dashboard data.../)).toBeInTheDocument();
    });

    test('renders stats grid with all stat boxes', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.getByText('Exercise')).toBeInTheDocument();
        expect(screen.getByText('Budget')).toBeInTheDocument();
        expect(screen.getByText('Net')).toBeInTheDocument();
        expect(screen.getByText('Weight')).toBeInTheDocument();
      });
    });

    test('renders action cards', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Log Calories')).toBeInTheDocument();
        expect(screen.getByText('Track Weight')).toBeInTheDocument();
        expect(screen.getByText('Weekly Report')).toBeInTheDocument();
        expect(screen.getByText('Update Goals')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    test('displays correct calorie data', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('1500')).toBeInTheDocument(); // Food calories
        expect(screen.getByText('300')).toBeInTheDocument(); // Exercise calories
      });
    });

    test('displays weight data when available', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('70')).toBeInTheDocument(); // Latest weight
      });
    });

    test('shows recent activity', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText(/Oatmeal/)).toBeInTheDocument();
        expect(screen.getByText(/Running/)).toBeInTheDocument();
      });
    });
  });

  describe('Weight Tracking', () => {
    test('allows weight entry', async () => {
      renderWithProviders(<Dashboard />);
      
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

    test('shows weight trend information', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Latest: 70 kg/)).toBeInTheDocument();
      });
    });

    test('renders weight chart', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      });
    });
  });

  describe('Charts', () => {
    test('renders weekly trend chart with data', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const charts = screen.getAllByTestId('line-chart');
        expect(charts).toHaveLength(2); // Weekly trends + Weight progress
        expect(screen.getByText('Weekly Trends')).toBeInTheDocument();
      });
    });

    test('shows empty state when no chart data available', async () => {
      nutritionService.getWeeklyReport.mockResolvedValue({ daily_summaries: [] });
      nutritionService.getWeightHistory.mockResolvedValue([]);
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/No weekly data available yet/)).toBeInTheDocument();
        expect(screen.getByText(/No weight data available yet/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API calls fail', async () => {
      nutritionService.getDailyReport.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
      });
    });

    test('handles weight entry errors gracefully', async () => {
      nutritionService.addOrUpdateWeightEntry.mockRejectedValue(new Error('Weight save failed'));
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const weightInput = screen.getByPlaceholderText('Weight (kg)');
        const saveButton = screen.getByText('Save Weight');
        
        fireEvent.change(weightInput, { target: { value: '69.5' } });
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save weight entry/)).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Integration', () => {
    test('shows setup link when metabolic rate not set', async () => {
      const authContextWithoutMetabolicRate = {
        ...mockAuthContext,
        currentUser: {
          ...mockAuthContext.currentUser,
          profile: {
            ...mockAuthContext.currentUser.profile,
            metabolic_rate: null,
          },
        },
      };
      
      renderWithProviders(<Dashboard />, authContextWithoutMetabolicRate);
      
      await waitFor(() => {
        expect(screen.getByText(/Set up metabolic rate/)).toBeInTheDocument();
      });
    });

    test('calculates net calories correctly with user profile', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        // Net calories = metabolic_rate (2000) - weight_loss_goal_calories (250) - food (1500) + exercise (300)
        // = 2000 - 250 - 1500 + 300 = 550
        expect(screen.getByText('550')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('navigation links work correctly', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const dailyEntryLinks = screen.getAllByRole('link');
        const logCaloriesLink = dailyEntryLinks.find(link => 
          link.textContent.includes('Log Calories')
        );
        const weeklyReportLink = dailyEntryLinks.find(link => 
          link.textContent.includes('Weekly Report')
        );
        
        expect(logCaloriesLink).toHaveAttribute('href', '/daily');
        expect(weeklyReportLink).toHaveAttribute('href', '/weekly');
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('adapts to mobile viewport', async () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const statsGrid = screen.getByText('Food').closest('div').parentElement;
        expect(statsGrid).toBeInTheDocument();
      });
    });
  });
}); 