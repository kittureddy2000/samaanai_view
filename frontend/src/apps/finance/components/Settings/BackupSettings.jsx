import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  CloudDownload as ExportIcon,
  GetApp as DownloadIcon,
  Description as FileIcon,
  TableChart as SpreadsheetIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import { useSnackbar } from 'notistack';
import api, { FINANCE_BASE_PATH } from '../../services/api';
import * as XLSX from 'xlsx';

const BackupSettings = () => {
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  const withFinanceBase = (path = '') => `${FINANCE_BASE_PATH}${path}`;

  // Fetch all transactions for export
  const fetchAllTransactions = async () => {
    const params = new URLSearchParams();
    params.append('page_size', '10000'); // Get all transactions

    // Apply date range filter
    if (dateRange !== 'all') {
      const today = new Date();
      let startDate;

      switch (dateRange) {
        case '30days':
          startDate = new Date(today.setDate(today.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(today.setDate(today.getDate() - 90));
          break;
        case '1year':
          startDate = new Date(today.setFullYear(today.getFullYear() - 1));
          break;
        case '2years':
          startDate = new Date(today.setFullYear(today.getFullYear() - 2));
          break;
        default:
          break;
      }

      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }
    }

    const resp = await api.get(withFinanceBase(`/transactions/?${params.toString()}`));
    return resp.data.results || resp.data || [];
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      setExportLoading(true);
      const transactions = await fetchAllTransactions();

      if (!transactions.length) {
        enqueueSnackbar('No transactions to export', { variant: 'warning' });
        return;
      }

      const headers = ['Date', 'Account', 'Description', 'Plaid Category', 'Custom Category', 'Amount'];
      const rows = transactions.map(tx => [
        tx.date,
        tx.account_name || tx.account || '',
        tx.merchant_name || tx.name,
        tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized',
        tx.user_category || '',
        tx.amount
      ]);

      const csvContent = [headers, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-transactions-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      enqueueSnackbar(`Exported ${transactions.length} transactions to CSV`, { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      enqueueSnackbar('Failed to export transactions', { variant: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const transactions = await fetchAllTransactions();

      if (!transactions.length) {
        enqueueSnackbar('No transactions to export', { variant: 'warning' });
        return;
      }

      const wsData = [
        ['Date', 'Account', 'Description', 'Plaid Category', 'Custom Category', 'Amount'],
        ...transactions.map(tx => [
          tx.date,
          tx.account_name || tx.account || '',
          tx.merchant_name || tx.name,
          tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized',
          tx.user_category || '',
          tx.amount
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `all-transactions-${Date.now()}.xlsx`);

      enqueueSnackbar(`Exported ${transactions.length} transactions to Excel`, { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      enqueueSnackbar('Failed to export transactions', { variant: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <SettingsContainer>
      <SectionTitle>Export Transactions</SectionTitle>
      <SectionDescription>
        Download all your transaction data in CSV or Excel format for analysis, tax preparation, or backup.
      </SectionDescription>

      <ExportCard>
        <ExportCardHeader>
          <ExportIcon sx={{ fontSize: 32, color: '#6366f1' }} />
          <div>
            <CardTitle>Transaction Export</CardTitle>
            <CardDescription>Export all transactions across all accounts</CardDescription>
          </div>
        </ExportCardHeader>

        <FilterRow>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              label="Date Range"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.5)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                '.MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' }
              }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
              <MenuItem value="1year">Last Year</MenuItem>
              <MenuItem value="2years">Last 2 Years</MenuItem>
            </Select>
          </FormControl>
        </FilterRow>

        <ButtonRow>
          <ExportButton
            onClick={exportToCSV}
            disabled={exportLoading}
            startIcon={exportLoading ? <CircularProgress size={16} /> : <FileIcon />}
          >
            Export as CSV
          </ExportButton>
          <ExportButton
            onClick={exportToExcel}
            disabled={exportLoading}
            startIcon={exportLoading ? <CircularProgress size={16} /> : <SpreadsheetIcon />}
            $primary
          >
            Export as Excel
          </ExportButton>
        </ButtonRow>
      </ExportCard>

      <InfoAlert>
        <strong>Tip:</strong> Use CSV format for importing into other financial tools. Excel format includes better formatting for viewing in spreadsheet applications.
      </InfoAlert>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 100%;
`;

const SectionTitle = styled.h2`
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const SectionDescription = styled.p`
  color: rgba(255,255,255,0.6);
  font-size: 0.9rem;
  margin: 0 0 24px 0;
`;

const ExportCard = styled.div`
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
`;

const ExportCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 4px 0;
`;

const CardDescription = styled.p`
  color: rgba(255,255,255,0.6);
  font-size: 0.85rem;
  margin: 0;
`;

const FilterRow = styled.div`
  margin-bottom: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ExportButton = styled(Button)`
  background: ${props => props.$primary ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent'} !important;
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(99,102,241,0.4)'} !important;
  color: ${props => props.$primary ? '#fff' : '#818cf8'} !important;
  padding: 10px 20px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  
  &:hover {
    background: ${props => props.$primary ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'rgba(99,102,241,0.1)'} !important;
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const InfoAlert = styled.div`
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 16px;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  
  strong {
    color: #818cf8;
  }
`;

export default BackupSettings;