import React from 'react';

export const currentUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  profile: {
    height: 180,
    weight: 75,
    date_of_birth: '1990-01-01',
    metabolic_rate: 2000,
    weight_loss_goal: -0.5,
    start_of_week: 2
  }
};

export const useAuth = jest.fn().mockReturnValue({
  currentUser,
  loading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  updateProfile: jest.fn(),
  updateMetrics: jest.fn()
});

export const AuthProvider = ({ children }) => {
  return <>{children}</>;
};
