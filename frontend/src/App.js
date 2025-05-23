import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AuthProvider } from './apps/calorie-tracker/contexts/AuthContext';
import { GlobalStyles, theme } from './common/styles/GlobalStyles';

// Pages
import Login from './apps/calorie-tracker/pages/Login';
import Register from './apps/calorie-tracker/pages/Register';
import Dashboard from './apps/calorie-tracker/pages/Dashboard';
import DailyEntry from './apps/calorie-tracker/pages/DailyEntry';
import WeeklyReport from './apps/calorie-tracker/pages/WeeklyReport';
import MonthlyReport from './apps/calorie-tracker/pages/MonthlyReport';
import YearlyReport from './apps/calorie-tracker/pages/YearlyReport';
import Profile from './apps/calorie-tracker/pages/Profile';
import SocialLoginCallback from './apps/calorie-tracker/pages/SocialLoginCallback';
import WeightTracking from './apps/calorie-tracker/pages/WeightTracking';

// Components
import Layout from './common/components/Layout/Layout';
import PrivateRoute from './apps/calorie-tracker/pages/PrivateRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/social-login-callback" element={<SocialLoginCallback />} />
            
            {/* Protected routes */}
            <Route path="/" element={<PrivateRoute element={<Layout />} />}>
              <Route index element={<Dashboard />} />
              <Route path="daily" element={<DailyEntry />} />
              <Route path="weekly" element={<WeeklyReport />} />
              <Route path="monthly" element={<MonthlyReport />} />
              <Route path="yearly" element={<YearlyReport />} />
              <Route path="profile" element={<Profile />} />
              <Route path="weight" element={<WeightTracking />} />
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;