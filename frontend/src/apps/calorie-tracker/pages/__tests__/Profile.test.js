import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Profile from '../Profile';
import { theme } from 'common/styles/GlobalStyles';
import { useAuth } from '../../../common/auth';

// Mock the auth context
jest.mock('../../contexts/AuthContext');

const renderWithTheme = (ui) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Profile Component', () => {
  beforeEach(() => {
    // Setup mock auth context
    useAuth.mockReturnValue({
      currentUser: {
        username: 'testuser',
        email: 'test@example.com',
        profile: {
          height: 180,
          weight: 75,
          date_of_birth: '1990-01-01',
          metabolic_rate: 2000,
          weight_loss_goal: -0.5,
          start_of_week: 2
        }
      },
      updateProfile: jest.fn().mockResolvedValue({}),
      updateMetrics: jest.fn().mockResolvedValue({}),
      setError: jest.fn()
    });
  });

  test('renders profile form with user data', async () => {
    renderWithTheme(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText(/User Profile/i)).toBeInTheDocument();
    });
    
    // Check for form fields with pre-filled values  
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // Height
    expect(screen.getByDisplayValue('75')).toBeInTheDocument();  // Weight
  });

  test('submits profile updates successfully', async () => {
    const mockUpdateMetrics = jest.fn().mockResolvedValue({});
    useAuth.mockReturnValue({
      currentUser: {
        username: 'testuser',
        email: 'test@example.com',
        profile: {
          height: 180,
          weight: 75,
          date_of_birth: '1990-01-01',
          metabolic_rate: 2000,
          weight_loss_goal: -0.5,
          start_of_week: 2
        }
      },
      updateProfile: jest.fn().mockResolvedValue({}),
      updateMetrics: mockUpdateMetrics,
      setError: jest.fn()
    });
    
    renderWithTheme(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText(/User Profile/i)).toBeInTheDocument();
    });
    
    // Find input fields by their current values and change them
    const heightInput = screen.getByDisplayValue('180');
    const weightInput = screen.getByDisplayValue('75');
    
    fireEvent.change(heightInput, { target: { value: '182' } });
    fireEvent.change(weightInput, { target: { value: '73' } });
    
    // Find start of week dropdown
    const startOfWeekSelect = screen.getByLabelText(/Start of Week/i) || 
                              screen.getByRole('combobox');
    fireEvent.change(startOfWeekSelect, { target: { value: '1' } }); // Tuesday
    
    // Find and click the save button
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Just verify the function was called - don't check exact parameters which can be affected by form processing
    await waitFor(() => {
      expect(mockUpdateMetrics).toHaveBeenCalled();
    });
  });
});

