import React, { useState, useMemo, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Collapse } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  AccountBalance as BankIcon,
  CreditCard as CreditIcon,
  Savings as SavingsIcon,
  TrendingUp as InvestmentIcon,
  ChevronLeft as ChevronLeftIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { usePlaidLink } from 'react-plaid-link';
import { useSnackbar } from 'notistack';
import { createLinkToken, exchangePublicToken, upgradeInstitutionForInvestments } from '../services/api';
import Tooltip from '@mui/material/Tooltip';

const AccountsSidebar = ({ accounts, loading, selectedAccount, onSelect, onAccountAdded, onClose, onRefresh }) => {
  const [expandedSections, setExpandedSections] = useState({
    banking: true,
    credit: true,
    savings: true,
    investment: false
  });

  // Plaid Link state
  const [linkToken, setLinkToken] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Get the most recent update time from institutions
  const lastUpdated = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    // Find the most recent update time from all institutions
    const updateTimes = accounts
      .map(acc => acc.institution?.last_successful_update)
      .filter(time => time)
      .map(time => new Date(time));

    if (updateTimes.length === 0) return null;

    const mostRecent = new Date(Math.max(...updateTimes));
    return mostRecent;
  }, [accounts]);

  const formatLastUpdated = (date) => {
    if (!date) return 'Never updated';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      enqueueSnackbar('Accounts refreshed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      enqueueSnackbar('Failed to refresh accounts', { variant: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper function to extract balance from account data
  const getAccountBalance = (account) => {
    // Try different possible balance field names from different APIs
    const possibleFields = [
      'balance',
      'current_balance',
      'available_balance',
      'amount',
      'current_amount',
      'available_amount'
    ];

    for (const field of possibleFields) {
      const value = account[field];
      if (value !== null && value !== undefined && value !== '') {
        // Handle string values with currency symbols
        let cleanValue = value;
        if (typeof value === 'string') {
          // Remove currency symbols, commas, and other formatting
          cleanValue = value.replace(/[$,\s]/g, '');
        }

        const parsed = parseFloat(cleanValue);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    console.warn('No valid balance found for account:', account.name, account);
    return 0;
  };

  // Fetch link_token when component mounts
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await createLinkToken();
        if (data && data.link_token) {
          setLinkToken(data.link_token);
        } else {
          console.error("AccountsSidebar: Failed to get link_token from backend");
        }
      } catch (error) {
        console.error('AccountsSidebar: Error fetching link_token:', error);
      }
    };
    fetchToken();
  }, []);

  const { open, ready, error: plaidError } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      // Exchange public token for access token
      const institutionId = metadata?.institution?.institution_id || metadata?.institution?.id;
      const institutionName = metadata?.institution?.name;
      const linkedAccounts = metadata?.accounts || [];

      if (!institutionId) {
        enqueueSnackbar('Unable to determine institution from Plaid response. Please try again.', { variant: 'error' });
        return;
      }

      exchangePublicToken(public_token, institutionId, institutionName, linkedAccounts)
        .then(() => {
          enqueueSnackbar('Account linked successfully!', { variant: 'success' });
          if (onAccountAdded) {
            onAccountAdded();
          }
        })
        .catch((e) => {
          console.error('AccountsSidebar: Error exchanging public token:', e);
        });
    },
    onExit: (err, metadata) => {
      if (err != null) {
        enqueueSnackbar(`Plaid Link exited with error: ${err.display_message || err.error_message || 'Unknown error'}`, { variant: 'warning' });
      }
    },
  });

  const handleAddAccountClick = () => {
    if (ready && linkToken) {
      open();
    } else {
      enqueueSnackbar('Plaid is not ready. Please wait or check for errors.', { variant: 'warning' });
    }
  };

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups = {
      banking: [],
      credit: [],
      savings: [],
      investment: []
    };

    accounts.forEach(account => {
      const type = account.type?.toLowerCase() || 'banking';
      const subtype = account.subtype?.toLowerCase() || '';

      if (type === 'depository') {
        if (subtype.includes('savings') || subtype.includes('money market')) {
          groups.savings.push(account);
        } else {
          groups.banking.push(account);
        }
      } else if (type === 'credit') {
        groups.credit.push(account);
      } else if (type === 'investment' || type === 'brokerage') {
        groups.investment.push(account);
      } else {
        groups.banking.push(account);
      }
    });

    return groups;
  }, [accounts]);

  // Calculate net worth
  const netWorth = useMemo(() => {
    return accounts.reduce((total, account) => {
      const balance = getAccountBalance(account);
      // For credit accounts, balance is typically negative (debt), so we subtract
      if (account.type?.toLowerCase() === 'credit') {
        return total - Math.abs(balance);
      }
      return total + balance;
    }, 0);
  }, [accounts]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getAccountStatus = (account) => {
    const balance = getAccountBalance(account);

    // Check Plaid connection status first - prioritize connection errors
    const institutionStatus = account.institution?.status || account.item_status;
    if (institutionStatus === 'error' || institutionStatus === 'needs_reauth' || institutionStatus === 'ITEM_LOGIN_REQUIRED') {
      return { icon: <ErrorIcon />, color: '#ef4444', status: 'error' };
    }

    // Credit account warnings - only calculate utilization if we have a valid credit limit
    if (account.type?.toLowerCase() === 'credit') {
      const creditLimit = parseFloat(account.credit_limit) || parseFloat(account.limit);

      // If no credit limit available, show green (no warning) instead of error
      if (!creditLimit || creditLimit <= 0) {
        return { icon: <CheckCircleIcon />, color: '#10b981', status: 'good' };
      }

      const utilization = Math.abs(balance) / creditLimit;
      if (utilization > 0.9) return { icon: <ErrorIcon />, color: '#ef4444', status: 'warning' };
      if (utilization > 0.7) return { icon: <WarningIcon />, color: '#f59e0b', status: 'warning' };
      return { icon: <CheckCircleIcon />, color: '#10b981', status: 'good' };
    }

    // Banking account warnings
    if (balance < 100) return { icon: <WarningIcon />, color: '#f59e0b', status: 'warning' };
    if (balance < 0) return { icon: <ErrorIcon />, color: '#ef4444', status: 'warning' };

    return { icon: <CheckCircleIcon />, color: '#10b981', status: 'good' };
  };

  // Format currency with NO decimal places – sidebar only needs whole-dollar precision
  const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return `$${Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const getSectionTotal = (accountList) => {
    return accountList.reduce((total, account) => {
      const balance = getAccountBalance(account);
      return total + Math.abs(balance);
    }, 0);
  };

  const getSectionIcon = (sectionType) => {
    // Accept lowercase keys because callers pass title.toLowerCase()
    switch (sectionType.toLowerCase()) {
      case 'banking':
        return <BankIcon sx={{ fontSize: '1.1rem', color: '#6b7280' }} />;
      case 'credit':
        return <CreditIcon sx={{ fontSize: '1.1rem', color: '#6b7280' }} />;
      case 'savings':
        return <SavingsIcon sx={{ fontSize: '1.1rem', color: '#6b7280' }} />;
      case 'investments':
        return <InvestmentIcon sx={{ fontSize: '1.1rem', color: '#6b7280' }} />;
      default:
        return <BankIcon sx={{ fontSize: '1.1rem', color: '#6b7280' }} />;
    }
  };

  const AccountItem = ({ account, isSelected, onClick }) => {
    const status = getAccountStatus(account);
    const balance = getAccountBalance(account);
    return (
      <AccountItemContainer $isSelected={isSelected} onClick={onClick}>
        <AccountInfo>
          <StatusIcon style={{ color: status.color }}>
            {status.icon}
          </StatusIcon>
          <AccountDetails>
            <Tooltip title={account.name} placement="top" arrow>
              <AccountName>{account.name}</AccountName>
            </Tooltip>
            <AccountMeta>
              {account.institution?.name || 'Unknown Bank'}
            </AccountMeta>
          </AccountDetails>
        </AccountInfo>
        <AccountBalance $isNegative={balance < 0}>
          {account.type?.toLowerCase() === 'credit' ? `-${formatCurrency(balance)}` : formatCurrency(balance)}
        </AccountBalance>
      </AccountItemContainer>
    );
  };

  const handleUpgradeForInvestments = async () => {
    if (isUpgrading) return;

    // Find institutions with investment accounts
    const investmentAccounts = accounts.filter(acc => acc.type === 'investment');
    const institutionsWithInvestments = [...new Set(investmentAccounts.map(acc => acc.institution))];

    if (institutionsWithInvestments.length === 0) {
      enqueueSnackbar('No investment accounts found', { variant: 'warning' });
      return;
    }

    setIsUpgrading(true);
    try {
      // For now, let's upgrade the first institution with investments (typically E*TRADE)
      const institution = institutionsWithInvestments[0];
      const response = await upgradeInstitutionForInvestments(institution.id);

      // Check if we got a link_token back
      if (response.link_token) {
        // Create a new Plaid Link instance directly
        const openPlaidLink = () => {
          if (window.Plaid) {
            const linkHandler = window.Plaid.create({
              token: response.link_token,
              onSuccess: (public_token, metadata) => {
                // Exchange public token for access token
                const institutionId = metadata?.institution?.institution_id || metadata?.institution?.id;
                const institutionName = metadata?.institution?.name;
                const linkedAccounts = metadata?.accounts || [];

                if (!institutionId) {
                  enqueueSnackbar('Unable to determine institution from Plaid response. Please try again.', { variant: 'error' });
                  return;
                }

                exchangePublicToken(public_token, institutionId, institutionName, linkedAccounts)
                  .then(() => {
                    enqueueSnackbar('Investment access upgraded successfully!', { variant: 'success' });
                    if (onAccountAdded) {
                      onAccountAdded();
                    }
                  })
                  .catch((e) => {
                    console.error('Upgrade flow: Error exchanging public token:', e);
                    enqueueSnackbar('Failed to complete investment upgrade. Please try again.', { variant: 'error' });
                  });
              },
              onExit: (err, metadata) => {
                if (err) {
                  enqueueSnackbar(`Investment upgrade cancelled: ${err.error_message || err.message}`, { variant: 'warning' });
                }
              },
            });
            linkHandler.open();
          } else {
            enqueueSnackbar('Plaid is not loaded. Please refresh the page and try again.', { variant: 'error' });
          }
        };

        enqueueSnackbar(`Re-authentication ready for ${institution.name}. Click here to continue.`, {
          variant: 'success',
          autoHideDuration: 10000,
          action: (
            <button
              onClick={openPlaidLink}
              style={{
                background: 'white',
                color: '#4CAF50',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Continue
            </button>
          )
        });

        // Also automatically try to open after a short delay
        setTimeout(openPlaidLink, 1000);

      } else {
        enqueueSnackbar(`Investment upgrade initiated for ${institution.name}. Please add your account again to complete the process.`, {
          variant: 'success',
          autoHideDuration: 8000
        });
      }
    } catch (error) {
      console.error('Error upgrading institution for investments:', error);
      enqueueSnackbar('Failed to upgrade institution for investments', { variant: 'error' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const SectionHeader = ({ title, total, isExpanded, onToggle, accountCount }) => (
    <SectionHeaderContainer onClick={onToggle}>
      <SectionHeaderLeft>
        <SectionHeaderTitle>
          {getSectionIcon(title.toLowerCase())}
          {title}
          <AccountCount>({accountCount})</AccountCount>
        </SectionHeaderTitle>
        <SectionTotal>{formatCurrency(total)}</SectionTotal>
      </SectionHeaderLeft>
      <SectionHeaderRight>
        {title === 'Investments' && accountCount > 0 && (
          <UpgradeButton
            onClick={(e) => {
              e.stopPropagation();
              handleUpgradeForInvestments();
            }}
            disabled={isUpgrading}
            title="Upgrade to access investment holdings"
          >
            {isUpgrading ? '⏳' : '⬆️'}
          </UpgradeButton>
        )}
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </SectionHeaderRight>
    </SectionHeaderContainer>
  );

  return (
    <SidebarRoot>
      {/* Header Section - Accounts Title */}
      <HeaderSection>
        <HeaderLeft>
          <CloseButton onClick={onClose} title="Close Accounts Panel">
            <ChevronLeftIcon />
          </CloseButton>
          <HeaderTitle>Accounts</HeaderTitle>
        </HeaderLeft>
        <HeaderRight>
          <HeaderRefreshButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={isRefreshing ? "Refreshing..." : "Refresh Balances"}
          >
            <RefreshIcon className={isRefreshing ? "spinning" : ""} />
          </HeaderRefreshButton>
          <HeaderAddButton
            onClick={handleAddAccountClick}
            disabled={!ready || !linkToken}
            title={linkToken && ready ? "Add New Account" : "Loading Plaid..."}
          >
            <AddIcon />
          </HeaderAddButton>
        </HeaderRight>
      </HeaderSection>

      {/* Net Worth Section */}
      <NetWorthSection>
        <NetWorthLabel>Net Worth</NetWorthLabel>
        <NetWorthValue $isNegative={netWorth < 0}>
          {netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </NetWorthValue>
        {lastUpdated && (
          <LastUpdatedText>
            Updated {formatLastUpdated(lastUpdated)}
          </LastUpdatedText>
        )}
      </NetWorthSection>

      {/* Account Sections */}
      <AccountSections>
        {/* Banking Section */}
        {groupedAccounts.banking.length > 0 && (
          <SectionContainer>
            <SectionHeader
              title="Banking"
              total={getSectionTotal(groupedAccounts.banking)}
              isExpanded={expandedSections.banking}
              onToggle={() => toggleSection('banking')}
              accountCount={groupedAccounts.banking.length}
            />
            <Collapse in={expandedSections.banking}>
              <AccountList>
                {groupedAccounts.banking.map(account => (
                  <AccountItem
                    key={account.id || account.plaid_account_id}
                    account={account}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => onSelect(account)}
                  />
                ))}
              </AccountList>
            </Collapse>
          </SectionContainer>
        )}

        {/* Credit Section */}
        {groupedAccounts.credit.length > 0 && (
          <SectionContainer>
            <SectionHeader
              title="Credit"
              total={getSectionTotal(groupedAccounts.credit)}
              isExpanded={expandedSections.credit}
              onToggle={() => toggleSection('credit')}
              accountCount={groupedAccounts.credit.length}
            />
            <Collapse in={expandedSections.credit}>
              <AccountList>
                {groupedAccounts.credit.map(account => (
                  <AccountItem
                    key={account.id || account.plaid_account_id}
                    account={account}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => onSelect(account)}
                  />
                ))}
              </AccountList>
            </Collapse>
          </SectionContainer>
        )}

        {/* Savings Section */}
        {groupedAccounts.savings.length > 0 && (
          <SectionContainer>
            <SectionHeader
              title="Savings"
              total={getSectionTotal(groupedAccounts.savings)}
              isExpanded={expandedSections.savings}
              onToggle={() => toggleSection('savings')}
              accountCount={groupedAccounts.savings.length}
            />
            <Collapse in={expandedSections.savings}>
              <AccountList>
                {groupedAccounts.savings.map(account => (
                  <AccountItem
                    key={account.id || account.plaid_account_id}
                    account={account}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => onSelect(account)}
                  />
                ))}
              </AccountList>
            </Collapse>
          </SectionContainer>
        )}

        {/* Investment Section */}
        {groupedAccounts.investment.length > 0 && (
          <SectionContainer>
            <SectionHeader
              title="Investments"
              total={getSectionTotal(groupedAccounts.investment)}
              isExpanded={expandedSections.investment}
              onToggle={() => toggleSection('investment')}
              accountCount={groupedAccounts.investment.length}
            />
            <Collapse in={expandedSections.investment}>
              <AccountList>
                {groupedAccounts.investment.map(account => (
                  <AccountItem
                    key={account.id || account.plaid_account_id}
                    account={account}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => onSelect(account)}
                  />
                ))}
              </AccountList>
            </Collapse>
          </SectionContainer>
        )}

        {/* Empty State */}
        {accounts.length === 0 && !loading && (
          <EmptyStateContainer>
            <EmptyStateIcon>🏦</EmptyStateIcon>
            <EmptyStateTitle>No Accounts Connected</EmptyStateTitle>
            <EmptyStateText>
              Connect your first bank account to get started with financial tracking.
            </EmptyStateText>
            <EmptyStateButton
              onClick={handleAddAccountClick}
              disabled={!ready || !linkToken}
            >
              {linkToken && ready ? 'Add Your First Account' : 'Loading...'}
            </EmptyStateButton>
          </EmptyStateContainer>
        )}

        {/* Loading State */}
        {loading && (
          <EmptyStateContainer>
            <EmptyStateTitle>Loading Accounts...</EmptyStateTitle>
            <EmptyStateText>
              Please wait while we fetch your account information.
            </EmptyStateText>
          </EmptyStateContainer>
        )}
      </AccountSections>
    </SidebarRoot>
  );
};

const SidebarRoot = styled.div`
  width: 280px;
  background: #16213e;
  border-right: 1px solid rgba(99, 102, 241, 0.15);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 99;
  height: 100%;
  border-radius: 8px 0 0 0;
  overflow: hidden; /* Keep hidden on root, AccountSections has overflow-y: auto */

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const HeaderSection = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  background: #1a1a2e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  padding: 6px;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.25);
    color: #fff;
    border-color: rgba(99, 102, 241, 0.5);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const HeaderTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderRefreshButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  color: #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    color: #a5b4fc;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.3);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const HeaderAddButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  color: #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    color: #a5b4fc;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.3);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const NetWorthSection = styled.div`
  padding: 20px 16px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  background: #1a1a2e;
  text-align: left;
`;

const NetWorthLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  font-weight: 500;
`;

const NetWorthValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$isNegative ? '#f87171' : '#fff'};
  line-height: 1.2;
`;

const LastUpdatedText = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 6px;
`;

const AccountSections = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  background: #16213e;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #3b3b5e;
    border-radius: 3px;
  }
`;

const SectionContainer = styled.div`
  margin-bottom: 20px;
`;

const SectionHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  background: rgba(99, 102, 241, 0.1);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  font-weight: 600;
  color: #fff;
  
  &:hover {
    background: rgba(99, 102, 241, 0.15);
  }
`;

const SectionHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SectionHeaderTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #fff;
  
  svg {
    color: rgba(255, 255, 255, 0.6) !important;
  }
`;

const SectionTotal = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const SectionHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.5);
`;

const AccountCount = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const UpgradeButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  margin-right: 8px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  
  &:disabled {
    background: rgba(255, 255, 255, 0.2);
    cursor: not-allowed;
  }
`;

const AccountList = styled.div`
  background: #16213e;
`;

const AccountItemContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 10px 40px;
  cursor: pointer;
  background: ${props => props.$isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
  border-left: ${props => props.$isSelected ? '3px solid #6366f1' : '3px solid transparent'};
  transition: background-color 0.15s ease;
  
  &:hover {
    background: ${props => props.$isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const AccountInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
`;

const AccountDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const AccountName = styled.div`
  font-weight: 500;
  font-size: 0.875rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  max-width: 140px;
`;

const AccountMeta = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
`;

const AccountBalance = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => props.$isNegative ? '#f87171' : '#fff'};
  text-align: right;
  white-space: nowrap;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const EmptyStateIcon = styled.div`
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 10px;
`;

const EmptyStateTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
`;

const EmptyStateText = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 20px;
  text-align: center;
`;

const EmptyStateButton = styled.button`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

export default AccountsSidebar; 
