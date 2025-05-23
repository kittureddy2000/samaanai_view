import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import WeeklyReport from '../WeeklyReport';
import { theme } from 'common/styles/GlobalStyles';
import nutritionService from '../../services/nutritionService';

// Mock the nutritionService
jest.mock('../../services/nutritionService');

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      profile: {
        start_of_week: 2 // Wednesday
      }
    }
  })
}));

// Setup mock data
nutritionService.getWeeklyReport.mockResolvedValue({
  start_date: '2023-01-01',
  end_date: '2023-01-07',
  total_food_calories: 12000,
  total_exercise_calories: 4400,
  net_calories: 7600,
  daily_entries: [
    { date: '2023-01-01', food_calories: 1800, exercise_calories: 600, net_calories: 1200 },
    { date: '2023-01-02', food_calories: 1700, exercise_calories: 500, net_calories: 1200 },
    { date: '2023-01-03', food_calories: 1600, exercise_calories: 700, net_calories: 900 },
    { date: '2023-01-04', food_calories: 1800, exercise_calories: 800, net_calories: 1000 },
    { date: '2023-01-05', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
    { date: '2023-01-06', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
    { date: '2023-01-07', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
  ]
});

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />
}));

const renderWithTheme = (ui) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('WeeklyReport Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the weekly report page', async () => {
    renderWithTheme(<WeeklyReport />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
    
    // Check for weekly summary titles
    expect(screen.getByText(/Weekly Calorie/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Food/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Balance/i)).toBeInTheDocument();
    
    // Check for chart heading - chart might not be rendered in test
    expect(screen.getByText(/Daily Breakdown/i)).toBeInTheDocument();
  });

  test('fetches weekly report data on load', async () => {
    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(nutritionService.getWeeklyReport).toHaveBeenCalledTimes(1);
    });
  });

  test('displays calories values', async () => {
    renderWithTheme(<WeeklyReport />);
    
    // Wait for data to load and check for any "cal" text
    await waitFor(() => {
      const calTexts = screen.getAllByText(/cal$/i);
      expect(calTexts.length).toBeGreaterThan(0);
    });
  });
});
