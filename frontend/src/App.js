import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AuthProvider, Login, SocialLoginCallback, PrivateRoute } from './common/auth';
import { GlobalStyles, theme } from './common/styles/GlobalStyles';
import { SnackbarProvider } from 'notistack';

// Pages
import Register from './apps/calorie-tracker/pages/Register';
import Dashboard from './apps/calorie-tracker/pages/Dashboard';
import DailyEntry from './apps/calorie-tracker/pages/DailyEntry';
import WeeklyReport from './apps/calorie-tracker/pages/WeeklyReport';
import MonthlyReport from './apps/calorie-tracker/pages/MonthlyReport';
import YearlyReport from './apps/calorie-tracker/pages/YearlyReport';
import Profile from './apps/calorie-tracker/pages/Profile';
import WeightTracking from './apps/calorie-tracker/pages/WeightTracking';
import FinanceAppPage from './apps/finance/pages/FinanceAppPage';
import OAuthCallback from './apps/finance/components/OAuthCallback';
import LandingPage from './pages/LandingPage';

// Components
import Layout from './common/components/Layout/Layout';
import Header from './common/components/Layout/Header';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public auth routes (no header) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/social-login-callback" element={<SocialLoginCallback />} />

              {/* All other routes with header */}
              <Route path="/*" element={
                <>
                  <Header />
                  <Routes>
                    {/* Public landing page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Nutrition app (protected) */}
                    <Route path="/nutrition" element={<PrivateRoute element={<Layout />} />}>
                      <Route index element={<Dashboard />} />
                      <Route path="daily" element={<DailyEntry />} />
                      <Route path="weekly" element={<WeeklyReport />} />
                      <Route path="monthly" element={<MonthlyReport />} />
                      <Route path="yearly" element={<YearlyReport />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="weight" element={<WeightTracking />} />
                    </Route>

                    {/* Finance app (protected) */}
                    <Route path="/finance" element={<PrivateRoute element={<FinanceAppPage />} />} />
                    
                    {/* OAuth callback for Plaid institutions like Chase */}
                    <Route path="/finance/oauth-callback" element={<PrivateRoute element={<OAuthCallback />} />} />

                    {/* Profile page (protected) */}
                    <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;