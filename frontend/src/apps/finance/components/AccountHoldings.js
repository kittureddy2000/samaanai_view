import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { getHoldings } from '../services/api';
import { TextField, Box, Button, Typography, Paper } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
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

  // Reset pagination when filters change
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

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases
        if (sortConfig.key === 'institution_value' || sortConfig.key === 'quantity' || sortConfig.key === 'institution_price') {
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

  // Paginated holdings
  const paginatedHoldings = useMemo(() => {
    const startIndex = (currentPage - 1) * holdingsPerPage;
    const endIndex = startIndex + holdingsPerPage;
    return filteredHoldings.slice(startIndex, endIndex);
  }, [filteredHoldings, currentPage, holdingsPerPage]);

  const totalPages = Math.ceil(filteredHoldings.length / holdingsPerPage);

  // Handle column sorting
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
      <Paper elevation={2} sx={{ 
        padding: '24px', 
        marginBottom: '24px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
          Portfolio Holdings - {account.name}
        </Typography>
        
        {/* Portfolio Summary */}
        {summary && (
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            marginBottom: 3, 
            padding: '16px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '12px',
            flexWrap: 'wrap'
          }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Value</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {summary.total_value_display || '$0.00'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Gain/Loss</Typography>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: summary.total_gain_loss >= 0 ? '#059669' : '#dc2626' 
              }}>
                {summary.total_gain_loss_display || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Holdings Count</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {summary.holdings_count || 0}
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Filter Row */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          marginBottom: '20px', 
          padding: '16px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <TextField 
            label="Search Symbol/Name" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            variant="outlined" 
            size="small"
            sx={{ minWidth: '180px', flex: '1 1 180px', maxWidth: '250px' }}
          />
          <TextField 
            label="Min Value" 
            type="number" 
            value={minValue} 
            onChange={(e) => setMinValue(e.target.value)} 
            variant="outlined" 
            size="small"
            sx={{ minWidth: '100px', flex: '1 1 100px', maxWidth: '140px' }}
          />
          <TextField 
            label="Max Value" 
            type="number" 
            value={maxValue} 
            onChange={(e) => setMaxValue(e.target.value)} 
            variant="outlined" 
            size="small"
            sx={{ minWidth: '100px', flex: '1 1 100px', maxWidth: '140px' }}
          />
          <Button 
            onClick={() => {
              setSearch('');
              setMinValue('');
              setMaxValue('');
              setSortConfig({ key: 'institution_value', direction: 'desc' });
              setCurrentPage(1);
            }}
            variant="outlined"
            size="small"
            sx={{ 
              height: '40px',
              minWidth: '120px',
              flex: '0 0 auto'
            }}
          >
            Clear Filters
          </Button>
          <Box sx={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            gap: 1,
            flex: '0 0 auto'
          }}>
            <Button 
              onClick={exportHoldingsToCSV} 
              startIcon={<FileDownloadIcon />} 
              size="small" 
              variant="outlined"
              disabled={!filteredHoldings.length}
            >
              CSV
            </Button>
            <Button 
              onClick={exportHoldingsToExcel} 
              startIcon={<FileDownloadIcon />} 
              size="small" 
              variant="outlined"
              disabled={!filteredHoldings.length}
            >
              Excel
            </Button>
          </Box>
        </Box>
        
        {/* Results Summary */}
        <Box sx={{ marginBottom: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredHoldings.length === holdings.length 
              ? `Showing all ${filteredHoldings.length} holdings`
              : `Showing ${filteredHoldings.length} of ${holdings.length} holdings`
            }
            {sortConfig.key && (
              <span> • Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})</span>
            )}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading holdings...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
            <Typography>{error}</Typography>
          </Box>
        ) : filteredHoldings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>No holdings found for the selected criteria.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <StyledTable>
                <thead>
                  <tr>
                    <SortableHeader 
                      onClick={() => handleSort('symbol')}
                      $sortDirection={sortConfig.key === 'symbol' ? sortConfig.direction : null}
                    >
                      Symbol
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('name')}
                      $sortDirection={sortConfig.key === 'name' ? sortConfig.direction : null}
                    >
                      Security Name
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('quantity')}
                      $sortDirection={sortConfig.key === 'quantity' ? sortConfig.direction : null}
                    >
                      Quantity
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('institution_price')}
                      $sortDirection={sortConfig.key === 'institution_price' ? sortConfig.direction : null}
                    >
                      Price
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('institution_value')}
                      $sortDirection={sortConfig.key === 'institution_value' ? sortConfig.direction : null}
                    >
                      Value
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('gain_loss')}
                      $sortDirection={sortConfig.key === 'gain_loss' ? sortConfig.direction : null}
                    >
                      Gain/Loss ($)
                    </SortableHeader>
                    <SortableHeader 
                      onClick={() => handleSort('gain_loss')}
                      $sortDirection={sortConfig.key === 'gain_loss' ? sortConfig.direction : null}
                    >
                      Gain/Loss (%)
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHoldings.map(holding => (
                    <tr key={holding.id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {holding.security?.ticker_symbol || 'N/A'}
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {holding.security?.name || 'N/A'}
                      </td>
                      <td>{holding.quantity_display || '0'}</td>
                      <td>${parseFloat(holding.institution_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td style={{ fontWeight: 600 }}>
                        {holding.value_display || '$0.00'}
                      </td>
                      <td style={{ 
                        color: (holding.unrealized_gain_loss || 0) >= 0 ? '#059669' : '#dc2626', 
                        fontWeight: 600 
                      }}>
                        {holding.gain_loss_display || 'N/A'}
                      </td>
                      <td style={{ 
                        color: (holding.unrealized_gain_loss || 0) >= 0 ? '#059669' : '#dc2626', 
                        fontWeight: 600 
                      }}>
                        {holding.gain_loss_percent_display || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </TableContainer>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <Typography variant="body2">
                  Showing {Math.min((currentPage - 1) * holdingsPerPage + 1, filteredHoldings.length)} - {Math.min(currentPage * holdingsPerPage, filteredHoldings.length)} of {filteredHoldings.length} holdings
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        size="small"
                        variant={currentPage === pageNum ? 'contained' : 'outlined'}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button 
                    size="small" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>
    </HoldingsRoot>
  );
};

const HoldingsRoot = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
  box-sizing: border-box;
`;

const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  max-height: 500px;
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  box-sizing: border-box;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  th, td {
    padding: 12px 16px;
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
    background: #f9fafb;
  }
  
  /* Custom column widths */
  th:nth-child(1), td:nth-child(1) {
    min-width: 80px;
  }
  th:nth-child(2), td:nth-child(2) {
    min-width: 200px;
    white-space: normal;
  }
  th:nth-child(3), td:nth-child(3) {
    min-width: 100px;
  }
  th:nth-child(4), td:nth-child(4) {
    min-width: 100px;
  }
  th:nth-child(5), td:nth-child(5) {
    min-width: 120px;
  }
  th:nth-child(6), td:nth-child(6) {
    min-width: 120px;
  }
  th:nth-child(7), td:nth-child(7) {
    min-width: 120px;
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

export default AccountHoldings; 