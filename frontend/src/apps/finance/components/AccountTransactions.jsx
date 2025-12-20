import React, { useEffect, useState, useMemo, useRef } from 'react';
import styled from 'styled-components';
import api, { FINANCE_BASE_PATH, getSpendingCategories, createTransaction, toggleExcludeFromReports } from '../services/api';
import {
  TextField, Box, Button, Typography, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, Checkbox, ListItemText, IconButton, Tooltip,
  InputAdornment, Chip, FormControl, InputLabel, Select, Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { useSnackbar } from 'notistack';

const AccountTransactions = ({ account }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState({});

  // API Pagination state
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

  // New transaction dialog
  const [newTxDialogOpen, setNewTxDialogOpen] = useState(false);
  const [newTxData, setNewTxData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    notes: ''
  });
  const [savingTx, setSavingTx] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPaginationInfo(prev => ({ ...prev, current_page: 1 }));
    fetchTransactions(1);
  }, [debouncedSearch, selectedCategories]);

  const withFinanceBase = (path = '') => `${FINANCE_BASE_PATH}${path}`;

  const fetchTransactions = async (page = 1, url = null) => {
    if (!account) return;

    try {
      setLoading(true);

      let requestPath;
      if (url) {
        try {
          const parsed = new URL(url);
          requestPath = parsed.pathname.replace(FINANCE_BASE_PATH, '') + parsed.search;
        } catch (e) {
          requestPath = url.replace(/^https?:\/\/[^/]+\/api\/finance/, '');
        }
      } else {
        const params = new URLSearchParams();
        params.append('account_id', account.id || account.plaid_account_id);
        params.append('page', page.toString());
        params.append('page_size', '200'); // Get more transactions for grouping

        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedCategories.length > 0) {
          params.append('category', selectedCategories[0]);
        }

        requestPath = `/transactions/?${params.toString()}`;
      }

      const resp = await api.get(withFinanceBase(requestPath));

      if (resp.data.results) {
        setTransactions(resp.data.results);
        setPaginationInfo({
          count: resp.data.count || 0,
          next: resp.data.next,
          previous: resp.data.previous,
          current_page: page,
          total_pages: Math.ceil((resp.data.count || 0) / 200)
        });
      } else {
        setTransactions(resp.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getSpendingCategories();
        const cats = categoriesData.results || categoriesData;
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (account) {
      fetchTransactions(1);
    }
  }, [account?.id, account?.plaid_account_id]);

  useEffect(() => {
    return () => {
      Object.values(categoryUpdateTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const handleUpdateUserCategory = async (transactionId, newCategory) => {
    setCategoryUpdates(prev => ({
      ...prev,
      [transactionId]: newCategory
    }));

    if (categoryUpdateTimeouts.current[transactionId]) {
      clearTimeout(categoryUpdateTimeouts.current[transactionId]);
    }

    categoryUpdateTimeouts.current[transactionId] = setTimeout(async () => {
      try {
        await api.patch(withFinanceBase(`/transactions/${transactionId}/update_category/`), {
          category: newCategory || null
        });

        setTransactions(prevTransactions =>
          prevTransactions.map(tx =>
            (tx.id === transactionId || tx.transaction_id === transactionId)
              ? { ...tx, user_category: newCategory }
              : tx
          )
        );

        setCategoryUpdates(prev => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
      } catch (error) {
        console.error('Failed to update transaction category:', error);
        setCategoryUpdates(prev => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
      }

      delete categoryUpdateTimeouts.current[transactionId];
    }, 1000);
  };

  // Toggle exclude from reports
  const handleToggleExclude = async (transactionId, currentValue) => {
    try {
      const result = await toggleExcludeFromReports(transactionId, !currentValue);
      if (result) {
        setTransactions(prev =>
          prev.map(tx =>
            tx.id === transactionId
              ? { ...tx, exclude_from_reports: result.exclude_from_reports }
              : tx
          )
        );
      }
    } catch (error) {
      console.error('Error toggling exclude:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group transactions by month with pending at top
  const groupedTransactions = useMemo(() => {
    const pending = transactions.filter(tx => tx.pending);
    const completed = transactions.filter(tx => !tx.pending);

    // Group completed by month
    const monthGroups = {};
    completed.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = { label: monthLabel, transactions: [] };
      }
      monthGroups[monthKey].transactions.push(tx);
    });

    // Sort months in descending order
    const sortedMonths = Object.entries(monthGroups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));

    return { pending, months: sortedMonths };
  }, [transactions]);

  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Create new transaction
  const handleCreateTransaction = async () => {
    if (!newTxData.description || !newTxData.amount) {
      enqueueSnackbar('Please fill in description and amount', { variant: 'warning' });
      return;
    }

    setSavingTx(true);
    try {
      const result = await createTransaction({
        account_id: account.id || account.plaid_account_id,
        description: newTxData.description,
        amount: parseFloat(newTxData.amount),
        date: newTxData.date,
        category: newTxData.category || 'OTHER',
        notes: newTxData.notes
      });

      if (result) {
        enqueueSnackbar('Transaction created successfully', { variant: 'success' });
        setNewTxDialogOpen(false);
        setNewTxData({
          description: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          category: '',
          notes: ''
        });
        fetchTransactions(1);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      enqueueSnackbar('Failed to create transaction', { variant: 'error' });
    } finally {
      setSavingTx(false);
    }
  };

  // Get unique Plaid categories
  const availableCategories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(tx => {
      if (tx.primary_category) cats.add(tx.primary_category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Render transaction row
  const renderTransactionRow = (tx) => (
    <TransactionRow key={tx.id || tx.transaction_id} $excluded={tx.exclude_from_reports}>
      <DateCell>{formatDate(tx.date)}</DateCell>
      <StatusCell>
        {tx.pending ? (
          <StatusBadge $pending>Pending</StatusBadge>
        ) : (
          <StatusBadge>Cleared</StatusBadge>
        )}
      </StatusCell>
      <PayeeCell title={tx.merchant_name || tx.name}>
        {tx.merchant_name || tx.name}
      </PayeeCell>
      <CategoryCell>
        {tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
      </CategoryCell>
      <td>
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
          sx={{ minWidth: 100 }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Set..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  background: 'transparent',
                  color: '#fff',
                  '& fieldset': { border: 'none' },
                  '&:hover fieldset': { border: '1px solid rgba(99,102,241,0.3)' },
                  '&.Mui-focused fieldset': { border: '1px solid #6366f1' },
                },
                '& .MuiOutlinedInput-input': {
                  padding: '4px 0',
                  color: '#fff',
                }
              }}
            />
          )}
        />
      </td>
      <ActionCell>
        <Tooltip title={tx.exclude_from_reports ? 'Include in reports' : 'Exclude from reports'}>
          <IconButton
            size="small"
            onClick={() => handleToggleExclude(tx.id, tx.exclude_from_reports)}
            sx={{
              color: tx.exclude_from_reports ? '#f87171' : 'rgba(255,255,255,0.4)',
              '&:hover': { color: tx.exclude_from_reports ? '#ef4444' : '#818cf8' }
            }}
          >
            {tx.exclude_from_reports ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </ActionCell>
      <AmountCell $isNegative={tx.amount < 0}>
        {tx.amount_display || `${tx.amount < 0 ? '+' : '-'}$${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </AmountCell>
    </TransactionRow>
  );

  return (
    <TxRoot>
      {/* Header */}
      <HeaderSection>
        <HeaderTitle>Transactions for {account.name}</HeaderTitle>
        <HeaderSubtitle>Showing {paginationInfo.count} transactions</HeaderSubtitle>
      </HeaderSection>

      {/* Filter Bar */}
      <FilterBar>
        <SearchBox>
          <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} />
          <SearchInput
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBox>

        <FilterActions>
          <FilterButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
            <FilterListIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Filters
            {selectedCategories.length > 0 && (
              <FilterBadge>{selectedCategories.length}</FilterBadge>
            )}
          </FilterButton>

          <Tooltip title="Export CSV">
            <ActionButton onClick={() => { }}>
              <FileDownloadIcon sx={{ fontSize: 18 }} />
            </ActionButton>
          </Tooltip>

          <NewButton onClick={() => setNewTxDialogOpen(true)}>
            <AddIcon sx={{ mr: 0.5, fontSize: 18 }} />
            New
          </NewButton>
        </FilterActions>
      </FilterBar>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        PaperProps={{
          sx: {
            background: '#1a1a2e',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#fff',
            minWidth: 250
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
          <Typography variant="subtitle2" sx={{ color: '#818cf8' }}>Categories</Typography>
        </Box>
        {availableCategories.slice(0, 15).map(cat => (
          <MenuItem
            key={cat}
            onClick={() => {
              if (selectedCategories.includes(cat)) {
                setSelectedCategories(prev => prev.filter(c => c !== cat));
              } else {
                setSelectedCategories(prev => [...prev, cat]);
              }
            }}
            sx={{ color: '#fff', '&:hover': { background: 'rgba(99,102,241,0.2)' } }}
          >
            <Checkbox
              checked={selectedCategories.includes(cat)}
              sx={{ color: 'rgba(255,255,255,0.5)', '&.Mui-checked': { color: '#6366f1' } }}
            />
            <ListItemText primary={cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
          </MenuItem>
        ))}
        <Box sx={{ p: 1, borderTop: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="small" onClick={() => setFilterAnchorEl(null)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={() => setFilterAnchorEl(null)} sx={{ background: '#6366f1' }}>
            Apply
          </Button>
        </Box>
      </Menu>

      {/* Transactions Content */}
      {loading ? (
        <LoadingState>Loading transactions...</LoadingState>
      ) : error ? (
        <ErrorState>{error}</ErrorState>
      ) : transactions.length === 0 ? (
        <EmptyState>No transactions found.</EmptyState>
      ) : (
        <TransactionsContainer>
          {/* Pending Section */}
          {groupedTransactions.pending.length > 0 && (
            <MonthSection>
              <SectionHeader onClick={() => toggleSection('pending')}>
                <SectionTitle>
                  {collapsedSections['pending'] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  Pending
                  <SectionCount>{groupedTransactions.pending.length}</SectionCount>
                </SectionTitle>
              </SectionHeader>
              <Collapse in={!collapsedSections['pending']}>
                <TableContainer>
                  <StyledTable>
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>Date</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th style={{ width: '25%' }}>Payee</th>
                        <th style={{ width: '15%' }}>Category</th>
                        <th style={{ width: 120 }}>Custom</th>
                        <th style={{ width: 60 }}></th>
                        <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTransactions.pending.map(renderTransactionRow)}
                    </tbody>
                  </StyledTable>
                </TableContainer>
              </Collapse>
            </MonthSection>
          )}

          {/* Monthly Sections */}
          {groupedTransactions.months.map(({ key, label, transactions: monthTxs }) => (
            <MonthSection key={key}>
              <SectionHeader onClick={() => toggleSection(key)}>
                <SectionTitle>
                  {collapsedSections[key] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  {label}
                  <SectionCount>{monthTxs.length}</SectionCount>
                </SectionTitle>
              </SectionHeader>
              <Collapse in={!collapsedSections[key]}>
                <TableContainer>
                  <StyledTable>
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>Date</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th style={{ width: '25%' }}>Payee</th>
                        <th style={{ width: '15%' }}>Category</th>
                        <th style={{ width: 120 }}>Custom</th>
                        <th style={{ width: 60 }}></th>
                        <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthTxs.map(renderTransactionRow)}
                    </tbody>
                  </StyledTable>
                </TableContainer>
              </Collapse>
            </MonthSection>
          ))}
        </TransactionsContainer>
      )}

      {/* New Transaction Dialog */}
      <Dialog
        open={newTxDialogOpen}
        onClose={() => setNewTxDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#1a1a2e',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Transaction
          <IconButton onClick={() => setNewTxDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Description"
              value={newTxData.description}
              onChange={(e) => setNewTxData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              required
              sx={dialogInputStyles}
            />
            <TextField
              label="Amount"
              type="number"
              value={newTxData.amount}
              onChange={(e) => setNewTxData(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
              required
              helperText="Positive = expense, Negative = income"
              InputProps={{
                startAdornment: <InputAdornment position="start" sx={{ color: 'rgba(255,255,255,0.5)' }}>$</InputAdornment>,
              }}
              sx={dialogInputStyles}
            />
            <TextField
              label="Date"
              type="date"
              value={newTxData.date}
              onChange={(e) => setNewTxData(prev => ({ ...prev, date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={dialogInputStyles}
            />
            <FormControl fullWidth sx={dialogInputStyles}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Category</InputLabel>
              <Select
                value={newTxData.category}
                onChange={(e) => setNewTxData(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                <MenuItem value="">None</MenuItem>
                {availableCategories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes (optional)"
              value={newTxData.notes}
              onChange={(e) => setNewTxData(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              sx={dialogInputStyles}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
          <Button onClick={() => setNewTxDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTransaction}
            variant="contained"
            disabled={savingTx}
            sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {savingTx ? 'Creating...' : 'Create Transaction'}
          </Button>
        </DialogActions>
      </Dialog>
    </TxRoot>
  );
};

// Dialog input styles
const dialogInputStyles = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(99,102,241,0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' },
};

// Styled components
const TxRoot = styled.div`
  width: 100%;
  padding: 0;
  margin: 0;
`;

const HeaderSection = styled.div`
  margin-bottom: 20px;
`;

const HeaderTitle = styled.h2`
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 4px 0;
`;

const HeaderSubtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 0.9rem;
  width: 100%;
  
  &::placeholder {
    color: rgba(255,255,255,0.4);
  }
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
  }
`;

const FilterBadge = styled.span`
  background: #6366f1;
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
  }
`;

const NewButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const TransactionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MonthSection = styled.div`
  background: rgba(26, 26, 46, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.1);
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background: rgba(99, 102, 241, 0.15);
  }
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  
  svg {
    color: rgba(255,255,255,0.6);
  }
`;

const SectionCount = styled.span`
  color: rgba(255,255,255,0.5);
  font-weight: 400;
  font-size: 0.8rem;
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  }
  
  th {
    color: rgba(255,255,255,0.5);
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(99, 102, 241, 0.05);
  }
  
  td {
    color: #fff;
    font-size: 0.85rem;
  }
  
  tbody tr:hover {
    background: rgba(99, 102, 241, 0.05);
  }
`;

const TransactionRow = styled.tr`
  ${props => props.$excluded && `
    opacity: 0.5;
    background: rgba(248, 113, 113, 0.05) !important;
  `}
`;

const DateCell = styled.td`
  white-space: nowrap;
  color: rgba(255,255,255,0.7) !important;
`;

const StatusCell = styled.td`
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => props.$pending ? `
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  ` : `
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
  `}
`;

const PayeeCell = styled.td`
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CategoryCell = styled.td`
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255,255,255,0.6) !important;
`;

const ActionCell = styled.td`
  text-align: center !important;
  padding: 4px !important;
`;

const AmountCell = styled.td`
  text-align: right !important;
  font-weight: 600;
  white-space: nowrap;
  color: ${props => props.$isNegative ? '#10b981' : '#f87171'} !important;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(255,255,255,0.6);
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 48px;
  color: #f87171;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(255,255,255,0.6);
`;

export default AccountTransactions;
