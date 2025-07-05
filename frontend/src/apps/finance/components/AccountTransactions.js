import React, { useEffect, useState, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { financeApiClient, getSpendingCategories } from '../services/api';
import { TextField, Box, Button, Typography, Paper, Autocomplete } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

const AccountTransactions = ({ account }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  
  // API Pagination state (from backend)
  const [paginationInfo, setPaginationInfo] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  });
  
  // Custom category states
  const [categoryUpdates, setCategoryUpdates] = useState({});
  const categoryUpdateTimeouts = useRef({});
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    setPaginationInfo(prev => ({ ...prev, current_page: 1 }));
    fetchTransactions(1);
  }, [debouncedSearch, minAmount, maxAmount, startDate, endDate]);

  // Function to fetch transactions with proper pagination handling
  const fetchTransactions = async (page = 1, url = null) => {
    if (!account) return;
    
    try {
      setLoading(true);
      
      let requestUrl;
      if (url) {
        // Provided URL could be absolute from DRF. Convert to relative path we can call via proxy.
      try {
          const parsed = new URL(url);
          requestUrl = parsed.pathname.replace('/api/finance', '') + parsed.search;
      } catch (e) {
          // Fallback to original replacement logic
          requestUrl = url.replace(/^https?:\/\/[^/]+\/api\/finance/, '');
        }
      } else {
        // Build URL with current filters and page
        const params = new URLSearchParams();
        params.append('account_id', account.id || account.plaid_account_id);
        params.append('page', page.toString());
        
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        requestUrl = `/transactions/?${params.toString()}`;
      }
      
      const resp = await financeApiClient.get(requestUrl);
      
      // Handle paginated response
      if (resp.data.results) {
        // Paginated response – append if we are loading next page, else replace
        setTransactions(prev => (page === 1 ? resp.data.results : [...prev, ...resp.data.results]));
        setPaginationInfo({
          count: resp.data.count || 0,
          next: resp.data.next,
          previous: resp.data.previous,
          current_page: page,
          total_pages: Math.ceil((resp.data.count || 0) / 50)
        });
      } else {
        // Non-paginated response (fallback)
        setTransactions(resp.data || []);
        setPaginationInfo({
          count: resp.data.length || 0,
          next: null,
          previous: null,
          current_page: 1,
          total_pages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
        setError('Failed to load transactions.');
      } finally {
        setLoading(false);
      }
    };

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getSpendingCategories();
        // Handle paginated response - extract categories from results field
        const categories = categoriesData.results || categoriesData;
        setCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch transactions when account changes
  useEffect(() => {
    if (account) {
      fetchTransactions(1);
    }
  }, [account?.id, account?.plaid_account_id]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(categoryUpdateTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Pagination handlers
  const handlePreviousPage = () => {
    if (paginationInfo.previous) {
      fetchTransactions(paginationInfo.current_page - 1, paginationInfo.previous);
    }
  };

  const handleNextPage = () => {
    if (paginationInfo.next) {
      fetchTransactions(paginationInfo.current_page + 1, paginationInfo.next);
    }
  };

  // Explicit page jump (used by numbered buttons)
  const handlePageClick = (pageNum) => {
    // If page differs, fetch– the helper will build correct query
    if (pageNum !== paginationInfo.current_page) {
      fetchTransactions(pageNum);
    }
  };

  // Infinite scroll – load next page when user reaches bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!paginationInfo.next || loading) return;
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        // Near bottom, load next page
        handleNextPage();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [paginationInfo.next, loading]);

  // Function to handle updating user category with debouncing
  const handleUpdateUserCategory = async (transactionId, newCategory) => {
    // Update local state immediately for better UX
    setCategoryUpdates(prev => ({
      ...prev,
      [transactionId]: newCategory
    }));

    // Clear existing timeout for this transaction
    if (categoryUpdateTimeouts.current[transactionId]) {
      clearTimeout(categoryUpdateTimeouts.current[transactionId]);
    }

    // Set new timeout to update backend after 1 second of no changes
    categoryUpdateTimeouts.current[transactionId] = setTimeout(async () => {
      try {
        await financeApiClient.patch(`/transactions/${transactionId}/update_category/`, {
          category: newCategory || null
        });
        
        // Update the transactions state
        setTransactions(prevTransactions => 
          prevTransactions.map(tx => 
            (tx.id === transactionId || tx.transaction_id === transactionId)
              ? { ...tx, user_category: newCategory }
              : tx
          )
        );

        // Remove from pending updates
        setCategoryUpdates(prev => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
      } catch (error) {
        console.error('Failed to update transaction category:', error);
        // Revert local state on error
        setCategoryUpdates(prev => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
      }
      
      // Clean up timeout reference
      delete categoryUpdateTimeouts.current[transactionId];
    }, 1000);
  };

  // Since we now use API pagination, we don't need local filtering/sorting
  // The API handles this for us, so we just display the transactions as-is
  const displayTransactions = transactions;

  // Handle column sorting (this would need API support to work properly)
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    // Note: For full sorting support, you'd need to modify the API to accept sort parameters
  };

  // Utility to format dates for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Export functions - these now work with all transactions (need to fetch all for export)
  const exportTransactionsToCSV = async () => {
    try {
      // Fetch all transactions without pagination for export
      const params = new URLSearchParams();
      params.append('account_id', account.id || account.plaid_account_id);
      params.append('page_size', '10000'); // Large number to get all transactions
      
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const resp = await financeApiClient.get(`/transactions/?${params.toString()}`);
      const allTransactions = resp.data.results || resp.data || [];
      
      if (!allTransactions.length) return;
      
      const headers = ['Date', 'Description', 'Plaid Category', 'Custom Category', 'Amount'];
      const rows = allTransactions.map(tx => [
        tx.date,
        tx.merchant_name || tx.name,
        tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized',
        tx.user_category || '',
        tx.amount_display || tx.amount
      ]);
      const csvContent = [headers, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${account.name}-transactions-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  };

  const exportTransactionsToExcel = async () => {
    try {
      // Fetch all transactions without pagination for export
      const params = new URLSearchParams();
      params.append('account_id', account.id || account.plaid_account_id);
      params.append('page_size', '10000'); // Large number to get all transactions
      
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const resp = await financeApiClient.get(`/transactions/?${params.toString()}`);
      const allTransactions = resp.data.results || resp.data || [];
      
      if (!allTransactions.length) return;
      
      const wsData = [
        ['Date', 'Description', 'Plaid Category', 'Custom Category', 'Amount'],
        ...allTransactions.map(tx => [
          tx.date,
          tx.merchant_name || tx.name,
          tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized',
          tx.user_category || '',
          tx.amount_display || tx.amount
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `${account.name}-transactions-${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  return (
    <TxRoot>
      <Paper elevation={2} sx={{ 
        padding: '16px 16px 20px 16px',
        margin: '12px 0 20px 0',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
          Transactions for {account.name}
        </Typography>
        
        {/* Enhanced Filter Row */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr 1fr 1fr 1.5fr' },
          gap: 2,
          alignItems: 'center',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}>
          <TextField
            label="Search Description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '140px', maxWidth: '250px', gridColumn: { xs: '1', sm: '1' } }}
          />
          <TextField
            label="Min Amount"
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '100px', maxWidth: '140px', gridColumn: { xs: '1', sm: '2' } }}
          />
          <TextField
            label="Max Amount"
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '100px', maxWidth: '140px', gridColumn: { xs: '1', sm: '3' } }}
          />
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '100px', maxWidth: '140px', gridColumn: { xs: '1', sm: '4' } }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '100px', maxWidth: '140px', gridColumn: { xs: '1', sm: '5' } }}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', gridColumn: { xs: '1', sm: '6' } }}>
            <Button
              onClick={() => {
                setSearch('');
                setMinAmount('');
                setMaxAmount('');
                setStartDate('');
                setEndDate('');
                setSortConfig({ key: 'date', direction: 'desc' });
                fetchTransactions(1);
              }}
              variant="outlined"
              size="small"
              sx={{ height: '40px', minWidth: '120px' }}
            >
              Clear Filters
            </Button>
            <Button
              onClick={exportTransactionsToCSV}
              startIcon={<FileDownloadIcon />}
              size="small"
              variant="outlined"
              disabled={!displayTransactions.length}
            >
              CSV
            </Button>
            <Button
              onClick={exportTransactionsToExcel}
              startIcon={<FileDownloadIcon />}
              size="small"
              variant="outlined"
              disabled={!displayTransactions.length}
            >
              Excel
            </Button>
          </Box>
        </Box>
        
        {/* Results Summary */}
        <Box sx={{ marginBottom: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {Math.min((paginationInfo.current_page - 1) * 50 + 1, paginationInfo.count)}-{Math.min(paginationInfo.current_page * 50, paginationInfo.count)} of {paginationInfo.count} transactions
            {sortConfig.key && (
              <span> • Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})</span>
            )}
          </Typography>
        </Box>

      {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading transactions...</Typography>
          </Box>
      ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
            <Typography>{error}</Typography>
          </Box>
        ) : displayTransactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>No transactions found for the selected criteria.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <StyledTable>
          <thead>
            <tr>
                    <SortableHeader 
                      onClick={() => handleSort('date')}
                      $sortDirection={sortConfig.key === 'date' ? sortConfig.direction : null}
                    >
                      Date
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('description')}
                      $sortDirection={sortConfig.key === 'description' ? sortConfig.direction : null}
                    >
                      Description
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('category')}
                      $sortDirection={sortConfig.key === 'category' ? sortConfig.direction : null}
                    >
                      Plaid Category
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('user_category')}
                      $sortDirection={sortConfig.key === 'user_category' ? sortConfig.direction : null}
                    >
                      Custom Category
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('amount')}
                      $sortDirection={sortConfig.key === 'amount' ? sortConfig.direction : null}
                    >
                      Amount
                    </SortableHeader>
            </tr>
          </thead>
          <tbody>
                  {displayTransactions.map(tx => (
                    <tr key={tx.id || tx.transaction_id} style={{ cursor: 'pointer', transition: 'background 0.15s', ':hover': { background: '#f5faff' } }}>
                      <td>{formatDate(tx.date)}</td>
                <td>{tx.merchant_name || tx.name}</td>
                      <td>{tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}</td>
                      <td style={{ minWidth: 120, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Autocomplete
                          value={categoryUpdates[tx.id || tx.transaction_id] ?? tx.user_category ?? ''}
                          onChange={(event, newValue) => {
                            handleUpdateUserCategory(tx.id || tx.transaction_id, newValue || '');
                          }}
                          onInputChange={(event, newInputValue) => {
                            handleUpdateUserCategory(tx.id || tx.transaction_id, newInputValue || '');
                          }}
                          options={Array.isArray(categories) ? categories.map(cat => cat.name) : []}
                          freeSolo
                          size="small"
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Set custom category..."
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '0.875rem',
                                  padding: 0,
                                  backgroundColor: (categoryUpdates[tx.id || tx.transaction_id] !== undefined) ? '#fff3cd' : 'transparent',
                                  '& fieldset': { border: 'none' },
                                  '&:hover fieldset': { border: '1px solid #e0e0e0' },
                                  '&.Mui-focused fieldset': { border: '1px solid #1976d2' },
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '6px 8px',
                                }
                              }}
                            />
                          )}
                        />
                      </td>
                <td style={{ color: tx.amount > 0 ? '#d32f2f' : '#388e3c', fontWeight: 600 }}>
                        {tx.amount_display || `$${Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                </td>
              </tr>
            ))}
          </tbody>
              </StyledTable>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <Typography variant="body2">
                Showing {paginationInfo.count === 0 ? 0 : Math.min((paginationInfo.current_page - 1) * 50 + 1, paginationInfo.count)}-{Math.min(paginationInfo.current_page * 50, paginationInfo.count)} of {paginationInfo.count} transactions
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button 
                  size="small" 
                  disabled={!paginationInfo.previous}
                  onClick={handlePreviousPage}
                  variant="outlined"
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, paginationInfo.total_pages) }, (_, i) => {
                  let pageNum;
                  if (paginationInfo.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (paginationInfo.current_page <= 3) {
                    pageNum = i + 1;
                  } else if (paginationInfo.current_page >= paginationInfo.total_pages - 2) {
                    pageNum = paginationInfo.total_pages - 4 + i;
                  } else {
                    pageNum = paginationInfo.current_page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      size="small"
                      variant={paginationInfo.current_page === pageNum ? 'contained' : 'outlined'}
                      onClick={() => handlePageClick(pageNum)}
                      sx={{ minWidth: 32, px: 0.5 }}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button 
                  size="small" 
                  disabled={!paginationInfo.next}
                  onClick={handleNextPage}
                  variant="outlined"
                >
                  Next
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </TxRoot>
  );
};

const TxRoot = styled.div`
  width: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
`;

const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  max-height: 600px;
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  box-sizing: border-box;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  th {
    color: #1976d2;
    font-weight: 600;
    background: #f4f6fa;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  tr:hover {
    background: #f5faff;
  }
  
  /* Custom column width for categories */
  th:nth-child(3), td:nth-child(3) {
    min-width: 140px;
  }
  th:nth-child(4), td:nth-child(4) {
    min-width: 120px;
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px !important;
  
  &:hover {
    background: #e3f2fd !important;
  }
  
  &::after {
    content: '';
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    
    ${props => {
      if (props.$sortDirection === 'asc') {
        return `
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 6px solid #1976d2;
        `;
      } else if (props.$sortDirection === 'desc') {
        return `
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 6px solid #1976d2;
        `;
      } else {
        return `
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 6px solid #ccc;
        `;
      }
    }}
  }
`;

export default AccountTransactions; 