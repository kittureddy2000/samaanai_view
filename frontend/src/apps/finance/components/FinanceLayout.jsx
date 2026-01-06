import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import FinanceSidebar from './FinanceSidebar';
import AccountsSidebar from './AccountsSidebar';
import FinanceDashboard from './FinanceDashboard';
import AccountTransactions from './AccountTransactions';
import AccountHoldings from './AccountHoldings';
import FinanceSettings from './Settings/FinanceSettings';
import { getInstitutions, refreshAccountBalances } from '../services/api';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Typography, Box } from '@mui/material';
import { useAuth } from '../../../common/auth';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

// Simple AccountsOverview component
const AccountsOverview = ({ accounts, loading }) => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Accounts Overview</Typography>
      <Typography variant="body1" color="text.secondary">
        Select an account from the sidebar to view its transactions, or return to the Dashboard for an overview of all your finances.
      </Typography>
      {accounts.length > 0 && (
        <Box sx={{ marginTop: 3 }}>
          <Typography variant="h6" gutterBottom>Connected Accounts: {accounts.length}</Typography>
          <Typography variant="body2" color="text.secondary">
            Total institutions: {new Set(accounts.map(acc => acc.institution?.id)).size}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const FinanceLayout = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAccountsSidebar, setShowAccountsSidebar] = useState(true);
  const [dashboardKey, setDashboardKey] = useState(0); // Add key to force dashboard refresh
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      setError(null);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError('Request timed out. Please check your connection and try again.');
      }, 15000); // 15 second timeout

      try {
        const institutionsResponse = await getInstitutions();
        clearTimeout(timeoutId);

        // Handle paginated response - extract institutions from results field
        const institutions = institutionsResponse?.results || institutionsResponse || [];

        // Flatten all accounts from all institutions
        const allAccounts = institutions.flatMap(inst => {
          return (inst.accounts || []).map(acc => ({ ...acc, institution: inst }));
        });

        setAccounts(allAccounts);
        setError(null);
      } catch (e) {
        clearTimeout(timeoutId);
        console.error('Error fetching accounts:', e);
        setAccounts([]);

        // Set user-friendly error message
        if (e.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (e.code === 'ECONNREFUSED' || e.message?.includes('Network Error')) {
          setError('Unable to connect to the server. Please try again later.');
        } else {
          setError('Failed to load accounts. Please refresh the page.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
    // Attach fetchAccounts to the component instance for refresh
    FinanceLayout.fetchAccounts = fetchAccounts;
  }, []);

  // Refresh accounts data
  const refreshAccounts = async () => {
    try {
      setLoading(true);
      const freshAccounts = await refreshAccountBalances();
      setAccounts(freshAccounts);

      // Force dashboard to refresh by updating key
      setDashboardKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      throw error; // Re-throw so AccountsSidebar can handle the error
    } finally {
      setLoading(false);
    }
  };

  // Handle view changes from sidebar
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      setSelectedAccount(null); // Clear selected account when going to dashboard
      setShowAccountsSidebar(true); // Show accounts sidebar for dashboard
    } else if (view === 'settings') {
      setShowAccountsSidebar(false); // Hide accounts sidebar for settings
    } else if (view === 'accounts') {
      setShowAccountsSidebar(true); // Show accounts sidebar for accounts view
    }
  };

  // Handle account selection
  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setCurrentView('accounts'); // Switch to accounts view when selecting an account
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <FinanceWrapper>
      <LayoutRoot>
        <FinanceSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          showAccountsSidebar={showAccountsSidebar}
          onToggleAccountsSidebar={() => setShowAccountsSidebar(true)}
        />
        {showAccountsSidebar && (
          <AccountsSidebar
            accounts={accounts}
            loading={loading}
            selectedAccount={selectedAccount}
            onSelect={handleAccountSelect}
            onAccountAdded={refreshAccounts}
            onRefresh={refreshAccounts}
            onClose={() => setShowAccountsSidebar(false)}
          />
        )}
        <MainContent>
          {error ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              textAlign: 'center',
              padding: 3
            }}>
              <Typography variant="h5" sx={{ color: '#f87171', mb: 2 }}>
                Something went wrong
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 400 }}>
                {error}
              </Typography>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                Retry
              </button>
            </Box>
          ) : currentView === 'dashboard' ? (
            <FinanceDashboard
              key={dashboardKey}
              accounts={accounts}
              loading={loading}
            />
          ) : currentView === 'accounts' ? (
            selectedAccount ? (
              // Show holdings for investment accounts, transactions for others
              selectedAccount.type === 'investment' ? (
                <AccountHoldings account={selectedAccount} />
              ) : (
                <AccountTransactions account={selectedAccount} />
              )
            ) : (
              <AccountsOverview accounts={accounts} loading={loading} />
            )
          ) : currentView === 'settings' ? (
            <FinanceSettings accounts={accounts} loading={loading} onRefreshAccounts={refreshAccounts} />
          ) : (
            <FinanceDashboard
              key={dashboardKey}
              accounts={accounts}
              loading={loading}
            />
          )}
        </MainContent>
      </LayoutRoot>
    </FinanceWrapper >
  );
};

const FinanceWrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
  overflow: hidden;
`;

const FinanceHeader = styled.header`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const DashboardLink = styled(Link)`
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  span.material-symbols-outlined {
    margin-right: 0.5rem;
    font-size: 20px;
  }
  
  &:hover {
    background: rgba(99, 102, 241, 0.2);
    color: #fff;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    
    span:not(.material-symbols-outlined) {
      display: none;
    }
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0 0.5rem;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeaderCenter = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CenterTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.5px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserMenuContainer = styled.div`
  position: relative;
`;

const UserMenuButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(99, 102, 241, 0.45);
  }
`;

const UserDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a2e;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 1001;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
`;

const LayoutRoot = styled.div`
  display: flex;
  flex: 1;
  align-items: stretch;
  background: #0f0f1a;
  overflow: hidden;
  margin-top: 8px;
  height: calc(100vh - 80px); /* Explicit height for scrolling children */
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px 16px;
  background: #0f0f1a;
  min-width: 0;
  
  /* Custom dark scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #3b3b5e;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #4f4f7a;
  }
`;

export default FinanceLayout;