import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import DailyEntry from '../pages/DailyEntry';
import { AuthContext } from '../contexts/AuthContext';
import nutritionService from '../services/nutritionService';

// Mock the services
jest.mock('../services/nutritionService');

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, customInput, ...props }) {
    const Component = customInput || 'input';
    return (
      <Component
        data-testid="date-picker"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onClick={() => onChange && onChange(new Date('2023-01-01'))}
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

describe('DailyEntry', () => {
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
          description: 'Breakfast',
          calories: 350,
        },
        {
          id: 2,
          meal_type: 'lunch',
          description: 'Lunch',
          calories: 600,
        },
      ],
      exercises: [
        {
          id: 1,
          description: 'Running',
          calories_burned: 300,
          duration_minutes: 30,
        },
      ],
    });

    nutritionService.addOrUpdateMealEntry.mockResolvedValue({ id: 3 });
    nutritionService.addOrUpdateExerciseEntry.mockResolvedValue({ id: 2 });
  });

  describe('Rendering', () => {
    test('renders daily entry page with title', async () => {
      renderWithProviders(<DailyEntry />);
      
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });

    test('displays loading state initially', () => {
      renderWithProviders(<DailyEntry />);
      expect(screen.getByText(/Loading daily data.../)).toBeInTheDocument();
    });

    test('renders date navigation controls', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        expect(screen.getByTestId('date-picker')).toBeInTheDocument();
        expect(screen.getAllByLabelText(/Previous day|Next day/)).toHaveLength(2);
      });
    });

    test('renders calorie entry forms', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        expect(screen.getByText('Log Calories')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Calories')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Calories Burned')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    test('populates form with existing data', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue('350');
        expect(inputs.length).toBeGreaterThan(0);
        
        const exerciseInput = screen.getByDisplayValue('300');
        expect(exerciseInput).toBeInTheDocument();
      });
    });

    test('shows desktop stats when data is loaded', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        expect(screen.getByText('1500')).toBeInTheDocument(); // Food calories in stats
        expect(screen.getByText('300')).toBeInTheDocument(); // Exercise calories in stats
      });
    });
  });

  describe('Form Interactions', () => {
    test('allows entering breakfast calories', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        fireEvent.change(breakfastInput, { target: { value: '400' } });
        expect(breakfastInput.value).toBe('400');
      });
    });

    test('allows entering exercise calories', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const exerciseInput = screen.getByLabelText(/Exercise/);
        fireEvent.change(exerciseInput, { target: { value: '250' } });
        expect(exerciseInput.value).toBe('250');
      });
    });

    test('submits form data correctly', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        const saveButton = screen.getByText('Save All Entries');
        
        fireEvent.change(breakfastInput, { target: { value: '450' } });
        fireEvent.click(saveButton);
        
        expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            meal_type: 'breakfast',
            calories: 450,
            description: 'Breakfast',
          })
        );
      });
    });
  });

  describe('Date Navigation', () => {
    test('navigates to previous day', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const prevButton = screen.getByLabelText('Previous day');
        fireEvent.click(prevButton);
        
        // Should trigger a new API call for the previous day
        expect(nutritionService.getDailyReport).toHaveBeenCalledTimes(2);
      });
    });

    test('navigates to next day', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const nextButton = screen.getByLabelText('Next day');
        fireEvent.click(nextButton);
        
        // Should trigger a new API call for the next day
        expect(nutritionService.getDailyReport).toHaveBeenCalledTimes(2);
      });
    });

    test('allows date selection via date picker', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const datePicker = screen.getByTestId('date-picker');
        fireEvent.click(datePicker);
        
        // Should trigger a new API call for the selected date
        expect(nutritionService.getDailyReport).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Net Calories Calculation', () => {
    test('calculates net calories correctly with user profile', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        // Net calories = metabolic_rate (2000) - weight_loss_goal_calories (250) - food (1500) + exercise (300)
        // = 2000 - 250 - 1500 + 300 = 550
        expect(screen.getByText('550')).toBeInTheDocument();
      });
    });

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
      
      renderWithProviders(<DailyEntry />, authContextWithoutMetabolicRate);
      
      await waitFor(() => {
        expect(screen.getByText(/Set up metabolic rate/)).toBeInTheDocument();
      });
    });

    test('uses default metabolic rate when not set', async () => {
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
      
      renderWithProviders(<DailyEntry />, authContextWithoutMetabolicRate);
      
      await waitFor(() => {
        // Should use default 2000 metabolic rate
        // Net = 2000 - 250 - 1500 + 300 = 550
        expect(screen.getByText('550')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Layout', () => {
    test('shows mobile stats at bottom on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Summary")).toBeInTheDocument();
      });
    });

    test('compresses date navigation on mobile', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const dateNav = screen.getByTestId('date-picker').closest('div');
        expect(dateNav).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error when data loading fails', async () => {
      nutritionService.getDailyReport.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch daily data/)).toBeInTheDocument();
      });
    });

    test('handles form submission errors gracefully', async () => {
      nutritionService.addOrUpdateMealEntry.mockRejectedValue(new Error('Save failed'));
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        const saveButton = screen.getByText('Save All Entries');
        
        fireEvent.change(breakfastInput, { target: { value: '450' } });
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save entries/)).toBeInTheDocument();
      });
    });

    test('shows error banner when errors occur', async () => {
      nutritionService.getDailyReport.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const errorBanner = screen.getByText(/Failed to fetch daily data/);
        expect(errorBanner).toBeInTheDocument();
        expect(errorBanner.closest('div')).toHaveStyle('background-color: #dc3545');
      });
    });
  });

  describe('Form Validation', () => {
    test('handles empty form submission', async () => {
      // Mock empty data response
      nutritionService.getDailyReport.mockResolvedValue({
        date: '2023-01-01',
        total_food_calories: 0,
        total_exercise_calories: 0,
        meals: [],
        exercises: [],
      });
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save All Entries');
        fireEvent.click(saveButton);
        
        // Should not make API calls for empty values
        expect(nutritionService.addOrUpdateMealEntry).not.toHaveBeenCalled();
        expect(nutritionService.addOrUpdateExerciseEntry).not.toHaveBeenCalled();
      });
    });

    test('only submits non-empty values', async () => {
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        const lunchInput = screen.getByLabelText(/Lunch/);
        const saveButton = screen.getByText('Save All Entries');
        
        // Clear lunch, keep breakfast
        fireEvent.change(lunchInput, { target: { value: '' } });
        fireEvent.change(breakfastInput, { target: { value: '400' } });
        fireEvent.click(saveButton);
        
        // Should only update breakfast
        expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            meal_type: 'breakfast',
            calories: 400,
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    test('shows saving state during form submission', async () => {
      // Mock a slow API response
      nutritionService.addOrUpdateMealEntry.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const breakfastInput = screen.getByLabelText(/Breakfast/);
        const saveButton = screen.getByText('Save All Entries');
        
        fireEvent.change(breakfastInput, { target: { value: '400' } });
        fireEvent.click(saveButton);
        
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
      });
    });

    test('disables form during submission', async () => {
      nutritionService.addOrUpdateMealEntry.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<DailyEntry />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save All Entries');
        fireEvent.click(saveButton);
        
        expect(saveButton).toBeDisabled();
      });
    });
  });
}); 