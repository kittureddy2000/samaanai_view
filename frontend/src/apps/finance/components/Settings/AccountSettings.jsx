import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  AccountBalance as BankIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import { usePlaidLink } from 'react-plaid-link';
import { useSnackbar } from 'notistack';
import {
  getInstitutions,
  syncInstitutionTransactions,
  deleteInstitution,
  createLinkToken,
  exchangePublicToken,
  updateAccountCustomName
} from '../../services/api';

const AccountSettings = ({ accounts: realAccounts, loading, onRefreshAccounts }) => {
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loadingActions, setLoadingActions] = useState({});
  const [reconnectingInst, setReconnectingInst] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [customNameValue, setCustomNameValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  // Fetch institutions with their accounts
  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoadingInstitutions(true);
      const data = await getInstitutions();
      setInstitutions(data.results || data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      enqueueSnackbar('Failed to load institutions', { variant: 'error' });
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Plaid Link for adding new accounts
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await createLinkToken();
        if (data?.link_token) {
          setLinkToken(data.link_token);
        }
      } catch (error) {
        console.error('Error creating link token:', error);
      }
    };
    fetchToken();
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      try {
        const institutionId = metadata?.institution?.institution_id;
        const institutionName = metadata?.institution?.name;
        await exchangePublicToken(public_token, institutionId, institutionName, metadata?.accounts || []);
        enqueueSnackbar('Account linked successfully!', { variant: 'success' });
        fetchInstitutions();
        if (onRefreshAccounts) onRefreshAccounts();
      } catch (error) {
        enqueueSnackbar('Failed to link account', { variant: 'error' });
      }
    },
    onExit: (err) => {
      if (err) {
        enqueueSnackbar(`Plaid Link error: ${err.display_message || 'Unknown error'}`, { variant: 'warning' });
      }
    },
  });

  const handleSyncInstitution = async (institutionId) => {
    setLoadingActions(prev => ({ ...prev, [institutionId]: 'syncing' }));
    try {
      await syncInstitutionTransactions(institutionId);
      enqueueSnackbar('Transactions synced successfully!', { variant: 'success' });
      fetchInstitutions();
    } catch (error) {
      enqueueSnackbar('Failed to sync transactions', { variant: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, [institutionId]: null }));
    }
  };

  const handleDeleteInstitution = async (institutionId) => {
    setLoadingActions(prev => ({ ...prev, [institutionId]: 'deleting' }));
    try {
      await deleteInstitution(institutionId);
      enqueueSnackbar('Institution removed successfully', { variant: 'success' });
      setConfirmDelete(null);
      fetchInstitutions();
      if (onRefreshAccounts) onRefreshAccounts();
    } catch (error) {
      enqueueSnackbar('Failed to remove institution', { variant: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, [institutionId]: null }));
    }
  };

  const handleStartEditingCustomName = (accountId, currentCustomName) => {
    setEditingAccountId(accountId);
    setCustomNameValue(currentCustomName || '');
  };

  const handleSaveCustomName = async (accountId) => {
    try {
      const updatedAccount = await updateAccountCustomName(accountId, customNameValue);

      // Update the institutions state with the new custom name
      setInstitutions(prevInstitutions =>
        prevInstitutions.map(inst => ({
          ...inst,
          accounts: inst.accounts?.map(acc =>
            acc.id === accountId ? { ...acc, custom_name: updatedAccount.custom_name, display_name: updatedAccount.display_name } : acc
          )
        }))
      );

      enqueueSnackbar('Account name updated successfully', { variant: 'success' });
      setEditingAccountId(null);
      setCustomNameValue('');
    } catch (error) {
      enqueueSnackbar('Failed to update account name', { variant: 'error' });
    }
  };

  const handleCancelEditingCustomName = () => {
    setEditingAccountId(null);
    setCustomNameValue('');
  };

  const getStatusInfo = (institution) => {
    if (institution.needs_update || institution.error_message) {
      return {
        icon: <ErrorIcon sx={{ color: '#ef4444', fontSize: '1.2rem' }} />,
        label: 'Needs Reconnection',
        color: '#ef4444',
        needsReconnect: true
      };
    }
    if (!institution.is_active) {
      return {
        icon: <WarningIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />,
        label: 'Inactive',
        color: '#f59e0b',
        needsReconnect: false
      };
    }
    return {
      icon: <ConnectedIcon sx={{ color: '#10b981', fontSize: '1.2rem' }} />,
      label: 'Connected',
      color: '#10b981',
      needsReconnect: false
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const connectedCount = institutions.filter(i => !i.needs_update && !i.error_message && i.is_active).length;
  const errorCount = institutions.filter(i => i.needs_update || i.error_message).length;
  const totalAccounts = institutions.reduce((sum, inst) => sum + (inst.accounts?.length || 0), 0);

  return (
    <SettingsContainer>
      {/* Summary Cards */}
      <SummaryGrid>
        <SummaryCard>
          <StatLabel>Institutions</StatLabel>
          <StatValue>{institutions.length}</StatValue>
        </SummaryCard>
        <SummaryCard>
          <StatLabel>Accounts</StatLabel>
          <StatValue>{totalAccounts}</StatValue>
        </SummaryCard>
        <SummaryCard>
          <StatLabel>Connected</StatLabel>
          <StatValue style={{ color: '#10b981' }}>{connectedCount}</StatValue>
        </SummaryCard>
        <SummaryCard>
          <StatLabel>Issues</StatLabel>
          <StatValue style={{ color: errorCount > 0 ? '#ef4444' : 'inherit' }}>{errorCount}</StatValue>
        </SummaryCard>
      </SummaryGrid>

      {/* Add Account Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => ready && linkToken && open()}
          disabled={!ready || !linkToken}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }
          }}
        >
          Link New Account
        </Button>
      </Box>

      {/* Institutions List */}
      {loadingInstitutions ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#6366f1' }} />
        </Box>
      ) : institutions.length === 0 ? (
        <EmptyState>
          <BankIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
            No connected institutions. Click "Link New Account" to get started.
          </Typography>
        </EmptyState>
      ) : (
        <InstitutionsList>
          {institutions.map((institution) => {
            const status = getStatusInfo(institution);
            const isLoading = loadingActions[institution.id];

            return (
              <InstitutionCard key={institution.id}>
                <InstitutionHeader>
                  <InstitutionInfo>
                    <InstitutionLogo>
                      {institution.logo_url ? (
                        <img src={institution.logo_url} alt={institution.name} />
                      ) : (
                        <BankIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                      )}
                    </InstitutionLogo>
                    <div>
                      <InstitutionName>{institution.name}</InstitutionName>
                      <InstitutionMeta>
                        {institution.accounts?.length || 0} accounts • Last synced: {formatDate(institution.updated_at)}
                      </InstitutionMeta>
                    </div>
                  </InstitutionInfo>
                  <StatusBadge $color={status.color}>
                    {status.icon}
                    <span>{status.label}</span>
                  </StatusBadge>
                </InstitutionHeader>

                {/* Error Message */}
                {institution.error_message && (
                  <ErrorMessage>
                    <ErrorIcon sx={{ fontSize: 16 }} />
                    {institution.error_message}
                  </ErrorMessage>
                )}

                {/* Accounts List */}
                <AccountsList>
                  {institution.accounts?.map((account) => (
                    <AccountRow key={account.id}>
                      <AccountInfo style={{ flex: 1 }}>
                        {editingAccountId === account.id ? (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                            <TextField
                              value={customNameValue}
                              onChange={(e) => setCustomNameValue(e.target.value)}
                              placeholder={account.name}
                              size="small"
                              fullWidth
                              autoFocus
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' },
                                  '&:hover fieldset': { borderColor: 'rgba(99, 102, 241, 0.5)' },
                                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveCustomName(account.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditingCustomName();
                                }
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleSaveCustomName(account.id)}
                              sx={{ color: '#10b981' }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEditingCustomName}
                              sx={{ color: '#ef4444' }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Box sx={{ flex: 1 }}>
                              <AccountName>
                                {account.display_name || account.name}
                                {account.custom_name && (
                                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>
                                    (was: {account.name})
                                  </span>
                                )}
                              </AccountName>
                              <AccountType>{account.type} • ****{account.mask}</AccountType>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleStartEditingCustomName(account.id, account.custom_name)}
                              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#6366f1' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </AccountInfo>
                      <AccountBalance $negative={account.current_balance < 0}>
                        ${Math.abs(account.current_balance || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </AccountBalance>
                    </AccountRow>
                  ))}
                </AccountsList>

                {/* Actions */}
                <InstitutionActions>
                  {status.needsReconnect && (
                    <ActionButton $primary onClick={() => setReconnectingInst(institution)}>
                      <LinkIcon sx={{ fontSize: 16 }} />
                      Reconnect
                    </ActionButton>
                  )}
                  <ActionButton
                    onClick={() => handleSyncInstitution(institution.id)}
                    disabled={isLoading === 'syncing'}
                  >
                    <RefreshIcon sx={{ fontSize: 16, animation: isLoading === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
                    {isLoading === 'syncing' ? 'Syncing...' : 'Sync'}
                  </ActionButton>
                  <ActionButton
                    $danger
                    onClick={() => setConfirmDelete(institution)}
                    disabled={isLoading === 'deleting'}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                    Remove
                  </ActionButton>
                </InstitutionActions>
              </InstitutionCard>
            );
          })}
        </InstitutionsList>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        PaperProps={{
          sx: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(99,102,241,0.2)' }
        }}
      >
        <DialogTitle>Remove Institution</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Are you sure you want to remove "{confirmDelete?.name}"?
            This will permanently delete all associated accounts and transaction data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteInstitution(confirmDelete.id)}
            variant="contained"
            color="error"
            disabled={loadingActions[confirmDelete?.id] === 'deleting'}
          >
            {loadingActions[confirmDelete?.id] === 'deleting' ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 100%;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const SummaryCard = styled.div`
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatLabel = styled.div`
  color: rgba(255,255,255,0.6);
  font-size: 0.85rem;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
`;

const InstitutionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InstitutionCard = styled.div`
  background: rgba(26, 26, 46, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
`;

const InstitutionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const InstitutionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InstitutionLogo = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const InstitutionName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
`;

const InstitutionMeta = styled.div`
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
  margin-top: 2px;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 0.8rem;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  color: #fca5a5;
  font-size: 0.85rem;
  margin-bottom: 16px;
`;

const AccountsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const AccountRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
`;

const AccountInfo = styled.div``;

const AccountName = styled.div`
  color: #fff;
  font-size: 0.9rem;
`;

const AccountType = styled.div`
  color: rgba(255,255,255,0.5);
  font-size: 0.75rem;
  margin-top: 2px;
`;

const AccountBalance = styled.div`
  color: ${props => props.$negative ? '#ef4444' : '#10b981'};
  font-weight: 600;
  font-size: 0.95rem;
`;

const InstitutionActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid rgba(99, 102, 241, 0.15);
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${props => props.$primary ? '#6366f1' : props.$danger ? '#ef4444' : 'rgba(99,102,241,0.3)'};
  background: ${props => props.$primary ? 'rgba(99,102,241,0.2)' : props.$danger ? 'rgba(239,68,68,0.1)' : 'transparent'};
  color: ${props => props.$primary ? '#818cf8' : props.$danger ? '#fca5a5' : 'rgba(255,255,255,0.7)'};
  
  &:hover {
    background: ${props => props.$primary ? 'rgba(99,102,241,0.3)' : props.$danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default AccountSettings;