import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { getHoldings } from '../services/api';
import { TextField, Box, Button, Typography, Tooltip, IconButton } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import * as XLSX from 'xlsx';

const AccountHoldings = ({ account }) => {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'institution_value', direction: 'desc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const holdingsPerPage = 50;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, minValue, maxValue]);

  useEffect(() => {
    const fetchHoldings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getHoldings({ account_id: account.id || account.plaid_account_id });
        setHoldings(response.holdings || []);
        setSummary(response.summary || {});
      } catch (e) {
        console.error('Error fetching holdings:', e);
        setError('Failed to load holdings.');
      } finally {
        setLoading(false);
      }
    };
    fetchHoldings();
  }, [account.id, account.plaid_account_id]);

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    if (!holdings.length) return [];

    let filtered = holdings.filter(holding => {
      const matchesSearch = debouncedSearch
        ? (holding.security?.ticker_symbol || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (holding.security?.name || '').toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const value = parseFloat(holding.institution_value) || 0;
      const matchesMin = minValue !== '' ? value >= parseFloat(minValue) : true;
      const matchesMax = maxValue !== '' ? value <= parseFloat(maxValue) : true;
      return matchesSearch && matchesMin && matchesMax;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'institution_value' || sortConfig.key === 'quantity' || sortConfig.key === 'institution_price' || sortConfig.key === 'cost_basis') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'symbol') {
          aValue = a.security?.ticker_symbol || '';
          bValue = b.security?.ticker_symbol || '';
        } else if (sortConfig.key === 'name') {
          aValue = a.security?.name || '';
          bValue = b.security?.name || '';
        } else if (sortConfig.key === 'gain_loss') {
          aValue = parseFloat(a.unrealized_gain_loss) || 0;
          bValue = parseFloat(b.unrealized_gain_loss) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [holdings, debouncedSearch, minValue, maxValue, sortConfig]);

  const paginatedHoldings = useMemo(() => {
    const startIndex = (currentPage - 1) * holdingsPerPage;
    const endIndex = startIndex + holdingsPerPage;
    return filteredHoldings.slice(startIndex, endIndex);
  }, [filteredHoldings, currentPage, holdingsPerPage]);

  const totalPages = Math.ceil(filteredHoldings.length / holdingsPerPage);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Export functions
  const exportHoldingsToCSV = () => {
    if (!filteredHoldings.length) return;
    const csvData = filteredHoldings.map(holding => ({
      Symbol: holding.security?.ticker_symbol || '',
      Name: holding.security?.name || '',
      Quantity: holding.quantity_display || '',
      Price: holding.institution_price ? `$${holding.institution_price}` : '',
      Value: holding.value_display || '',
      'Gain/Loss': holding.gain_loss_display || '',
      'Gain/Loss %': holding.gain_loss_percent_display || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account.name}_holdings.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportHoldingsToExcel = () => {
    if (!filteredHoldings.length) return;
    const excelData = filteredHoldings.map(holding => ({
      Symbol: holding.security?.ticker_symbol || '',
      Name: holding.security?.name || '',
      Quantity: parseFloat(holding.quantity) || 0,
      Price: parseFloat(holding.institution_price) || 0,
      Value: parseFloat(holding.institution_value) || 0,
      'Gain/Loss': parseFloat(holding.unrealized_gain_loss) || 0,
      'Gain/Loss %': parseFloat(holding.unrealized_gain_loss_percent) || 0
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holdings');
    XLSX.writeFile(wb, `${account.name}_holdings.xlsx`);
  };

  return (
    <HoldingsRoot>
      {/* Header */}
      <HeaderSection>
        <HeaderTitle>Portfolio Holdings - {account.name}</HeaderTitle>
        <HeaderSubtitle>Showing {filteredHoldings.length} holdings</HeaderSubtitle>
      </HeaderSection>

      {/* Summary Cards */}
      {summary && (
        <SummaryCards>
          <SummaryCard>
            <SummaryLabel>Total Value</SummaryLabel>
            <SummaryValue>{summary.total_value_display || '$0.00'}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Total Gain/Loss</SummaryLabel>
            <SummaryValue $positive={(summary.total_gain_loss || 0) >= 0}>
              {summary.total_gain_loss_display || 'N/A'}
            </SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Holdings Count</SummaryLabel>
            <SummaryValue>{summary.holdings_count || 0}</SummaryValue>
          </SummaryCard>
        </SummaryCards>
      )}

      {/* Filter Bar */}
      <FilterBar>
        <SearchBox>
          <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} />
          <SearchInput
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBox>

        <FilterActions>
          <Tooltip title="Export CSV">
            <ActionButton onClick={exportHoldingsToCSV} disabled={!filteredHoldings.length}>
              <FileDownloadIcon sx={{ fontSize: 18 }} />
            </ActionButton>
          </Tooltip>
        </FilterActions>
      </FilterBar>

      {/* Holdings Table */}
      {loading ? (
        <LoadingState>Loading holdings...</LoadingState>
      ) : error ? (
        <ErrorState>{error}</ErrorState>
      ) : filteredHoldings.length === 0 ? (
        <EmptyState>No holdings found for this account.</EmptyState>
      ) : (
        <>
          <TableContainer>
            <StyledTable>
              <thead>
                <tr>
                  <SortableHeader onClick={() => handleSort('symbol')} $active={sortConfig.key === 'symbol'}>
                    Symbol
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('name')} $active={sortConfig.key === 'name'}>
                    Security Name
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('quantity')} $active={sortConfig.key === 'quantity'}>
                    Quantity
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('institution_price')} $active={sortConfig.key === 'institution_price'}>
                    Price
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('institution_value')} $active={sortConfig.key === 'institution_value'}>
                    Value
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('cost_basis')} $active={sortConfig.key === 'cost_basis'}>
                    Cost Basis
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('gain_loss')} $active={sortConfig.key === 'gain_loss'}>
                    Gain/Loss
                  </SortableHeader>
                  <SortableHeader onClick={() => handleSort('gain_loss')} $active={sortConfig.key === 'gain_loss'}>
                    %
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {paginatedHoldings.map(holding => (
                  <tr key={holding.id}>
                    <SymbolCell>{holding.security?.ticker_symbol || 'N/A'}</SymbolCell>
                    <NameCell title={holding.security?.name}>{holding.security?.name || 'N/A'}</NameCell>
                    <td>{holding.quantity_display || '0'}</td>
                    <td>${parseFloat(holding.institution_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <ValueCell>{holding.value_display || '$0.00'}</ValueCell>
                    <td>{holding.cost_basis ? `$${parseFloat(holding.cost_basis).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</td>
                    <GainLossCell $positive={(holding.unrealized_gain_loss || 0) >= 0}>
                      {holding.gain_loss_display || 'N/A'}
                    </GainLossCell>
                    <GainLossCell $positive={(holding.unrealized_gain_loss || 0) >= 0}>
                      {holding.gain_loss_percent_display || 'N/A'}
                    </GainLossCell>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationBar>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Page {currentPage} of {totalPages}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <PaginationButton disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  Previous
                </PaginationButton>
                <PaginationButton disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  Next
                </PaginationButton>
              </Box>
            </PaginationBar>
          )}
        </>
      )}
    </HoldingsRoot>
  );
};

// Styled components with dark theme
const HoldingsRoot = styled.div`
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

const SummaryCards = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SummaryCard = styled.div`
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px 24px;
  min-width: 150px;
`;

const SummaryLabel = styled.div`
  color: rgba(255,255,255,0.6);
  font-size: 0.8rem;
  margin-bottom: 4px;
`;

const SummaryValue = styled.div`
  color: ${props => props.$positive === false ? '#f87171' : props.$positive === true ? '#10b981' : '#fff'};
  font-size: 1.25rem;
  font-weight: 600;
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
  
  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const TableContainer = styled.div`
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  overflow: hidden;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px 16px;
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

const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  
  ${props => props.$active && `
    color: #818cf8 !important;
  `}
  
  &:hover {
    color: #818cf8;
  }
`;

const SymbolCell = styled.td`
  font-weight: 600;
  color: #818cf8 !important;
`;

const NameCell = styled.td`
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ValueCell = styled.td`
  font-weight: 600;
`;

const GainLossCell = styled.td`
  font-weight: 600;
  color: ${props => props.$positive ? '#10b981' : '#f87171'} !important;
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
`;

const PaginationButton = styled.button`
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 6px;
  color: rgba(255,255,255,0.8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
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

export default AccountHoldings;