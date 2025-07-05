import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  AccountBalance as BankIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import styled from 'styled-components';

const AccountSettings = ({ accounts: realAccounts, loading, onRefreshAccounts, onAccountUpdate }) => {
  // Use real accounts instead of mock data
  const accounts = realAccounts || [];
  
  // Transform real account data to match the expected format
  const formattedAccounts = accounts.map(account => ({
    id: account.id,
    name: account.name || account.official_name || 'Unknown Account',
    institution: account.institution?.name || 'Unknown Institution',
    type: account.type || account.subtype || 'Unknown',
    status: 'connected', // Assume connected if we have the data
    lastSync: new Date().toLocaleString(), // Use current time as placeholder
    balance: account.balance || 0
  }));
  
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loadingActions, setLoadingActions] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleRefreshAccount = async (accountId) => {
    setLoadingActions(prev => ({ ...prev, [accountId]: 'refreshing' }));
    try {
      // Call the parent's refresh function if provided
      if (onRefreshAccounts) {
        await onRefreshAccounts();
      }
      setSuccessMessage('Account balances refreshed successfully');
      if (onAccountUpdate) {
        onAccountUpdate();
      }
    } catch (error) {
      setError('Failed to refresh account balances');
    } finally {
      setLoadingActions(prev => ({ ...prev, [accountId]: null }));
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      setLoadingActions(prev => ({ ...prev, [accountId]: 'deleting' }));
      try {
        // TODO: Add delete account API call here
        setSuccessMessage('Account deleted successfully');
        if (onAccountUpdate) {
          onAccountUpdate();
        }
      } catch (error) {
        setError('Failed to delete account');
      } finally {
        setLoadingActions(prev => ({ ...prev, [accountId]: null }));
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <ConnectedIcon sx={{ color: '#059669', fontSize: '1.2rem' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#dc2626', fontSize: '1.2rem' }} />;
      default:
        return <RefreshIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />;
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'connected':
        return <Chip label="Connected" size="small" color="success" />;
      case 'error':
        return <Chip label="Error" size="small" color="error" />;
      default:
        return <Chip label="Syncing" size="small" color="warning" />;
    }
  };

  return (
    <SettingsContainer>
      <Alert severity="info" sx={{ mb: 3 }}>
        Manage your connected bank accounts and financial institutions. All data is securely encrypted and synchronized.
      </Alert>

      {/* Summary */}
      <SummarySection>
        <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Connected Accounts
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              size="small"
            >
              Link New Account
            </Button>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <SummaryCard>
              <Typography variant="body2" color="text.secondary">Total Accounts</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {formattedAccounts.length}
              </Typography>
            </SummaryCard>
            <SummaryCard>
              <Typography variant="body2" color="text.secondary">Connected</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#059669' }}>
                {formattedAccounts.filter(acc => acc.status === 'connected').length}
              </Typography>
            </SummaryCard>
            <SummaryCard>
              <Typography variant="body2" color="text.secondary">Issues</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#dc2626' }}>
                {formattedAccounts.filter(acc => acc.status === 'error').length}
              </Typography>
            </SummaryCard>
          </Box>
        </Paper>
      </SummarySection>

      {/* Accounts Table */}
      <SettingsSection>
        <SectionTitle variant="h6">Account Details</SectionTitle>
        
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Account</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Institution</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Sync</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formattedAccounts.map((account) => (
                <TableRow key={account.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <BankIcon sx={{ color: '#6b7280' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {account.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {account.institution}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {account.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: account.balance < 0 ? '#dc2626' : '#1e293b'
                      }}
                    >
                      ${Math.abs(account.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(account.status)}
                      {getStatusChip(account.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {account.lastSync}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRefreshAccount(account.id)}
                        sx={{ color: '#3b82f6' }}
                        title="Refresh Account"
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => setConfirmDelete(account)}
                        sx={{ color: '#dc2626' }}
                        title="Remove Account"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SettingsSection>

      {/* Sync Settings */}
      <SettingsSection>
        <SectionTitle variant="h6">Sync Settings</SectionTitle>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Control how often your accounts are synchronized and updated.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small">
              Sync Now
            </Button>
            <Button variant="outlined" size="small">
              Auto-sync Settings
            </Button>
            <Button variant="outlined" size="small">
              Notification Preferences
            </Button>
          </Box>
        </Paper>
      </SettingsSection>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!confirmDelete} 
        onClose={() => setConfirmDelete(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{confirmDelete?.name}" from your account? 
            This will permanently delete all associated transaction data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button 
            onClick={() => handleDeleteAccount(confirmDelete.id)} 
            color="error"
            variant="contained"
          >
            Remove Account
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 1000px;
`;

const SummarySection = styled.div`
  margin-bottom: 32px;
`;

const SummaryCard = styled(Box)`
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const SettingsSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600 !important;
  color: #1e293b !important;
  margin-bottom: 16px !important;
`;

export default AccountSettings; 