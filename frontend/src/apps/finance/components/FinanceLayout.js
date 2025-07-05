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
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAccountsSidebar, setShowAccountsSidebar] = useState(true);
  const [dashboardKey, setDashboardKey] = useState(0); // Add key to force dashboard refresh
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const institutionsResponse = await getInstitutions();
        
        // Handle paginated response - extract institutions from results field
        const institutions = institutionsResponse.results || institutionsResponse;
        
        // Flatten all accounts from all institutions
        const allAccounts = institutions.flatMap(inst => {
          return (inst.accounts || []).map(acc => ({ ...acc, institution: inst }));
        });
        
        setAccounts(allAccounts);
      } catch (e) {
        console.error('Error fetching accounts:', e);
        setAccounts([]);
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
    <>
      <FinanceHeader>
        <HeaderContent>
          <HeaderLeft>
            <DashboardLink to="/">
              <span className="material-symbols-outlined">home</span>
              <span>Dashboard</span>
            </DashboardLink>
            <LogoSection>
              <AssessmentIcon sx={{ fontSize: 32, color: '#fff', mr: 1 }} />
              <HeaderTitle>FinanceApp</HeaderTitle>
            </LogoSection>
          </HeaderLeft>
          
          <HeaderCenter>
            <CenterTitle>Financial Management</CenterTitle>
          </HeaderCenter>
          
          <HeaderRight>
            {currentUser && (
              <UserInfo>
                <PersonIcon sx={{ fontSize: '1.2rem', mr: 0.5 }} />
                <span>{currentUser.username}</span>
              </UserInfo>
            )}
            <LogoutButton onClick={handleLogout}>
              <LogoutIcon sx={{ fontSize: '1.2rem', mr: 0.5 }} />
              <span>Logout</span>
            </LogoutButton>
          </HeaderRight>
        </HeaderContent>
      </FinanceHeader>
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
          {currentView === 'dashboard' ? (
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
    </>
  );
};

const FinanceHeader = styled.header`
  background: linear-gradient(90deg, #1976d2 0%, #2196f3 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 60px;
  display: flex;
  align-items: center;
`;

const HeaderContent = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
  color: #fff;
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
    background-color: rgba(255, 255, 255, 0.1);
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
`;

const HeaderCenter = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CenterTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
  letter-spacing: 0.5px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 8px 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const LayoutRoot = styled.div`
  display: flex;
  height: calc(100vh - 60px); /* full viewport minus fixed header */
  margin-top: 60px; /* position content below header */
  background: #f7f8fa;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px 16px 32px 16px;
  margin-left: 0;
  background: #f7f8fa;
  min-width: 0;
`;

export default FinanceLayout;