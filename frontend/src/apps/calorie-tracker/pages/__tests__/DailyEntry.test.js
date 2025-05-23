import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import DailyEntry from '../DailyEntry';
import { theme } from 'common/styles/GlobalStyles';
import nutritionService from '../../services/nutritionService';

// Mock the nutritionService
jest.mock('../../services/nutritionService');

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      profile: {
        metabolic_rate: 2000,
        weight_loss_goal: -0.5
      }
    }
  })
}));

// Setup to match actual component structure
nutritionService.getDailyReport.mockResolvedValue({
  date: '2023-01-01',
  meals: [
    { id: 1, meal_type: 'breakfast', description: 'Breakfast', calories: 400 },
    { id: 2, meal_type: 'lunch', description: 'Lunch', calories: 600 }
  ],
  exercises: [
    { id: 1, description: 'Daily Exercise', calories_burned: 300, duration_minutes: 30 }
  ],
  total_food_calories: 1000,
  total_exercise_calories: 300
});

const renderWithTheme = (ui) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('DailyEntry Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the daily log page', async () => {
    renderWithTheme(<DailyEntry />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });
    
    // Check for main sections
    expect(screen.getByText('Log Calories')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Net Calories')).toBeInTheDocument();
  });

  test('submits meal entries successfully', async () => {
    renderWithTheme(<DailyEntry />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });
    
    // Get all input fields - find by type and placeholder
    const inputs = screen.getAllByPlaceholderText('Calories');
    const breakfastInput = inputs[0]; // First calorie input is breakfast
    const lunchInput = inputs[1]; // Second calorie input is lunch
    
    // Fill in meal entries
    fireEvent.change(breakfastInput, { target: { value: '300' } });
    fireEvent.change(lunchInput, { target: { value: '500' } });
    
    // Submit form - find by button text
    const saveButton = screen.getByText(/Save All Entries/i);
    fireEvent.click(saveButton);
    
    // Verify API calls
    await waitFor(() => {
      // We expect 4 calls (all meal types) but 2 will have values
      expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal_type: 'breakfast',
          calories: 300
        })
      );
      expect(nutritionService.addOrUpdateMealEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          meal_type: 'lunch',
          calories: 500
        })
      );
    });
  });

  test('displays food and exercise sections', async () => {
    renderWithTheme(<DailyEntry />);
    
    // Wait for component to load with mock data
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });
    
    // Just check that the Food and Exercise sections are rendered with any calorie values
    await waitFor(() => {
      // Find the food section
      expect(screen.getByText('Food')).toBeInTheDocument();
      // Find the exercise section
      expect(screen.getByText('Exercise')).toBeInTheDocument();
      // Look for any calorie text
      expect(screen.getAllByText(/cal/i).length).toBeGreaterThan(0);
    });
  });
});
