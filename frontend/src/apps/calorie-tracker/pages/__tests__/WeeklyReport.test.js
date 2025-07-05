import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
        start_of_week: 2, // Wednesday
        metabolic_rate: 2000
      }
    }
  })
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }) => (
    <div data-testid="mock-bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}));

// Mock date-fns functions
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: (date, formatStr) => {
    if (formatStr === 'EEE, MMM d') return 'Wed, Jan 1';
    if (formatStr === 'MMM d') return 'Jan 1';
    if (formatStr === 'MMM d, yyyy') return 'Jan 7, 2023';
    return date.toString();
  },
  getDay: (date) => 3, // Wednesday
  subDays: (date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000),
  addDays: (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
  parseISO: (str) => new Date(str)
}));

// Setup updated mock data to match current API structure
const mockWeeklyData = {
  start_date: '2023-01-01',
  end_date: '2023-01-07',
  overall_total_food_calories: 12000,
  overall_total_exercise_calories: 2100,
  overall_total_net_calories: 9900,
  daily_summaries: [
    { 
      date: '2023-01-01', 
      total_food_calories: 1800, 
      total_exercise_calories: 300, 
      net_calories: 1500 
    },
    { 
      date: '2023-01-02', 
      total_food_calories: 1700, 
      total_exercise_calories: 300, 
      net_calories: 1400 
    },
    { 
      date: '2023-01-03', 
      total_food_calories: 1600, 
      total_exercise_calories: 300, 
      net_calories: 1300 
    },
    { 
      date: '2023-01-04', 
      total_food_calories: 1800, 
      total_exercise_calories: 300, 
      net_calories: 1500 
    },
    { 
      date: '2023-01-05', 
      total_food_calories: 1700, 
      total_exercise_calories: 300, 
      net_calories: 1400 
    },
    { 
      date: '2023-01-06', 
      total_food_calories: 1700, 
      total_exercise_calories: 300, 
      net_calories: 1400 
    },
    { 
      date: '2023-01-07', 
      total_food_calories: 1700, 
      total_exercise_calories: 300, 
      net_calories: 1400 
    }
  ]
};

nutritionService.getWeeklyReport.mockResolvedValue(mockWeeklyData);

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
    expect(screen.getByText(/Weekly Calorie Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Food/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Balance/i)).toBeInTheDocument();
    
    // Check for chart heading
    expect(screen.getByText(/Daily Breakdown/i)).toBeInTheDocument();
  });

  test('fetches weekly report data on load', async () => {
    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(nutritionService.getWeeklyReport).toHaveBeenCalledTimes(1);
    });
  });

  test('displays correct calorie values from mock data', async () => {
    renderWithTheme(<WeeklyReport />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('12000 cal')).toBeInTheDocument(); // Total Food
      expect(screen.getByText('2100 cal')).toBeInTheDocument(); // Total Exercise
      expect(screen.getByText('9900 cal')).toBeInTheDocument(); // Net Balance
    });
  });

  test('handles week navigation', async () => {
    renderWithTheme(<WeeklyReport />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });

    // Find navigation buttons
    const prevButton = screen.getByLabelText('Previous week');
    const nextButton = screen.getByLabelText('Next week');
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    
    // Test navigation
    fireEvent.click(prevButton);
    await waitFor(() => {
      expect(nutritionService.getWeeklyReport).toHaveBeenCalledTimes(2);
    });
    
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(nutritionService.getWeeklyReport).toHaveBeenCalledTimes(3);
    });
  });

  test('displays week range correctly', async () => {
    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(screen.getByText(/Jan 1 - Jan 7, 2023/)).toBeInTheDocument();
      expect(screen.getByText(/Wednesday start/)).toBeInTheDocument();
    });
  });

  test('renders chart with correct data', async () => {
    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      const chart = screen.getByTestId('mock-bar-chart');
      expect(chart).toBeInTheDocument();
      
      // Check that chart data is passed correctly
      const chartData = screen.getByTestId('chart-data');
      expect(chartData).toBeInTheDocument();
    });
  });

  test('handles empty data gracefully', async () => {
    nutritionService.getWeeklyReport.mockResolvedValue({
      start_date: '2023-01-01',
      end_date: '2023-01-07',
      overall_total_food_calories: 0,
      overall_total_exercise_calories: 0,
      overall_total_net_calories: 0,
      daily_summaries: []
    });

    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(screen.getByText('0 cal')).toBeInTheDocument();
    });
  });

  test('handles loading state', () => {
    // Mock a delayed response
    nutritionService.getWeeklyReport.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockWeeklyData), 1000))
    );

    renderWithTheme(<WeeklyReport />);
    
    expect(screen.getByText('Loading weekly data...')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    nutritionService.getWeeklyReport.mockRejectedValue(new Error('API Error'));

    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch weekly report/)).toBeInTheDocument();
    });
  });

  test('shows setup link when metabolic rate is not set', async () => {
    // Mock auth context without metabolic rate
    jest.doMock('../../contexts/AuthContext', () => ({
      useAuth: () => ({
        currentUser: {
          profile: {
            start_of_week: 2
            // No metabolic_rate
          }
        }
      })
    }));

    renderWithTheme(<WeeklyReport />);
    
    await waitFor(() => {
      expect(screen.getByText(/Set up metabolic rate/)).toBeInTheDocument();
    });
  });
});
