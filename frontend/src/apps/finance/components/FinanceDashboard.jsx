import React, { useEffect, useState, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { TextField, Box, Select, MenuItem, InputLabel, FormControl, Grid, Paper, Typography, Button } from '@mui/material';
import api, { FINANCE_BASE_PATH, getInstitutions, getAccounts, getSpendingCategories, getDashboardData } from '../services/api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const FinanceDashboard = ({ accounts, loading }) => {
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [institutions, setInstitutions] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ institution: '', account: '', category: '' });
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Sorting state for transactions table
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, minAmount, maxAmount, filters]);

  const filteredTransactions = useMemo(() => {
    if (!dashboard || !dashboard.recent_transactions) return [];

    let filtered = dashboard.recent_transactions.filter(tx => {
      const matchesSearch = debouncedSearch
        ? (tx.merchant_name || tx.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.category_display || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.user_category || '').toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const amt = parseFloat(tx.amount);
      const matchesMin = minAmount !== '' ? amt >= parseFloat(minAmount) : true;
      const matchesMax = maxAmount !== '' ? amt <= parseFloat(maxAmount) : true;
      return matchesSearch && matchesMin && matchesMax;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases
        if (sortConfig.key === 'amount') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'description') {
          aValue = a.merchant_name || a.name || '';
          bValue = b.merchant_name || b.name || '';
        } else if (sortConfig.key === 'category') {
          aValue = a.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized';
          bValue = b.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized';
        } else if (sortConfig.key === 'user_category') {
          aValue = a.user_category || '';
          bValue = b.user_category || '';
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
  }, [dashboard, debouncedSearch, minAmount, maxAmount, sortConfig]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, transactionsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  // Handle column sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  useEffect(() => {
    // Fetch filter options
    getInstitutions().then(data => {
      // Handle paginated response - extract institutions from results field
      const institutions = data.results || data;
      setInstitutions(Array.isArray(institutions) ? institutions : []);
    }).catch(() => setInstitutions([]));
    getAccounts().then(data => {
      // Handle paginated response - extract accounts from results field
      const accounts = data.results || data;
      setAccountsList(Array.isArray(accounts) ? accounts : []);
    }).catch(() => setAccountsList([]));
    getSpendingCategories().then(data => {
      // Handle paginated response - extract categories from results field
      const categories = data.results || data;
      setCategories(Array.isArray(categories) ? categories : []);
    }).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setDashLoading(true);
      setError(null);
      try {
        const params = {
          start_date: dateRange.start,
          end_date: dateRange.end,
          institution_id: filters.institution || undefined,
          account_id: filters.account || undefined,
          category: filters.category || undefined,
        };

        // Remove undefined values
        Object.keys(params).forEach(key => {
          if (params[key] === undefined) {
            delete params[key];
          }
        });

        const dashboardData = await getDashboardData(params);
        setDashboard(dashboardData);
      } catch (e) {
        console.error('Dashboard error:', e);
        setError('Failed to load dashboard analytics.');
      } finally {
        setDashLoading(false);
      }
    };
    fetchDashboard();
  }, [dateRange, filters]);

  // Chart refs for cleanup and DOM checking
  const spendingChartRef = useRef();
  const categoryPieRef = useRef();
  const netWorthTrendRef = useRef();
  const spendingOverTimeRef = useRef();
  const topMerchantsRef = useRef();
  const groupPieRef = useRef();
  const monthlySpendingRef = useRef();
  const monthlyNetIncomeRef = useRef();

  // Container refs to check DOM readiness
  const spendingChartContainerRef = useRef();
  const categoryPieContainerRef = useRef();
  const monthlySpendingContainerRef = useRef();
  const monthlyNetIncomeContainerRef = useRef();

  // Chart ready effect - ensure DOM is ready before rendering charts
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only set ready if container elements exist in DOM
      if (spendingChartContainerRef.current && categoryPieContainerRef.current &&
        monthlySpendingContainerRef.current && monthlyNetIncomeContainerRef.current) {
        setChartsReady(true);
      } else {
        // Retry after a longer delay if containers aren't ready
        setTimeout(() => {
          if (spendingChartContainerRef.current && categoryPieContainerRef.current &&
            monthlySpendingContainerRef.current && monthlyNetIncomeContainerRef.current) {
            setChartsReady(true);
          }
        }, 500);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [dashboard]); // Re-check when dashboard data changes

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      [spendingChartRef, categoryPieRef, netWorthTrendRef, spendingOverTimeRef, topMerchantsRef, groupPieRef, monthlySpendingRef, monthlyNetIncomeRef].forEach(ref => {
        if (ref.current && typeof ref.current.destroy === 'function') {
          try {
            ref.current.destroy();
          } catch (error) {
            console.warn('Chart cleanup error:', error);
          }
        }
      });
    };
  }, []);

  // Safe chart rendering function
  const renderChart = (ChartComponent, data, options, chartRef, containerRef, key) => {
    if (!chartsReady || !data || !containerRef.current) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {!chartsReady ? 'Loading chart...' : 'No data available'}
        </Typography>
      );
    }

    try {
      return (
        <ChartComponent
          ref={chartRef}
          data={data}
          options={options}
          key={key}
        />
      );
    } catch (error) {
      console.error('Chart render error:', error);
      return (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Chart rendering error
        </Typography>
      );
    }
  };

  // Prepare data for Top Spending Categories (replacing the horizontal bar chart)
  const topSpendingCategories = useMemo(() => {
    if (!dashboard?.spending_by_category?.length) return [];

    // Group by effective category (user_category if available, otherwise primary_category)
    const categoryTotals = {};

    // Process transactions to group by effective category
    if (dashboard.recent_transactions) {
      dashboard.recent_transactions.forEach(transaction => {
        if (transaction.amount > 0) { // Only expenses
          // Use custom category if available, otherwise fall back to Plaid category
          const effectiveCategory = transaction.user_category ||
            transaction.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ||
            'Uncategorized';

          categoryTotals[effectiveCategory] = (categoryTotals[effectiveCategory] || 0) + parseFloat(transaction.amount);
        }
      });
    }

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Show top 6 categories
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
      }));
  }, [dashboard]);

  // Prepare data for Spending by Category chart
  const spendingChartData = dashboard && dashboard.spending_by_category && dashboard.spending_by_category.length > 0
    ? {
      labels: dashboard.spending_by_category.map(cat =>
        cat.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'
      ),
      datasets: [
        {
          label: 'Spending',
          data: dashboard.spending_by_category.map(cat => cat.total),
          backgroundColor: '#1976d2',
        },
      ],
    }
    : null;

  // Prepare data for Net Worth Trend chart
  const netWorthTrendData = dashboard && dashboard.net_worth_trend && dashboard.net_worth_trend.length > 0
    ? {
      labels: dashboard.net_worth_trend.map(snap => snap.date),
      datasets: [
        {
          label: 'Net Worth',
          data: dashboard.net_worth_trend.map(snap => snap.net_worth),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          fill: true,
          tension: 0.3,
        },
      ],
    }
    : null;

  // Pie chart data for spending by category
  const spendingPieData = dashboard && dashboard.spending_by_category && dashboard.spending_by_category.length > 0
    ? {
      labels: dashboard.spending_by_category.map(cat =>
        cat.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'
      ),
      datasets: [
        {
          data: dashboard.spending_by_category.map(cat => cat.total),
          backgroundColor: [
            '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#0288d1'
          ],
        },
      ],
    }
    : null;

  // Prepare data for Spending Over Time chart
  const spendingOverTimeData = filteredTransactions.length > 0
    ? (() => {
      const dateMap = {};
      filteredTransactions.forEach(tx => {
        if (tx.amount > 0) {
          dateMap[tx.date] = (dateMap[tx.date] || 0) + tx.amount;
        }
      });
      const dates = Object.keys(dateMap).sort();
      return {
        labels: dates,
        datasets: [
          {
            label: 'Spending',
            data: dates.map(d => dateMap[d]),
            borderColor: '#d32f2f',
            backgroundColor: 'rgba(211,47,47,0.08)',
            fill: true,
            tension: 0.3,
          },
        ],
      };
    })()
    : null;

  // Prepare data for Top Merchants chart
  const topMerchantsData = filteredTransactions.length > 0
    ? (() => {
      const merchantMap = {};
      filteredTransactions.forEach(tx => {
        const merchant = (tx.merchant_name || tx.name || 'Unknown').trim();
        if (tx.amount > 0) {
          merchantMap[merchant] = (merchantMap[merchant] || 0) + tx.amount;
        }
      });
      const sorted = Object.entries(merchantMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      return {
        labels: sorted.map(([merchant]) => merchant),
        datasets: [
          {
            label: 'Spending',
            data: sorted.map(([_, amt]) => amt),
            backgroundColor: '#7b1fa2',
          },
        ],
      };
    })()
    : null;

  // Detect recurring transactions
  const recurringTransactions = useMemo(() => {
    if (!filteredTransactions.length) return [];
    // Group by merchant+amount (rounded to nearest $1)
    const groups = {};
    filteredTransactions.forEach(tx => {
      const merchant = (tx.merchant_name || tx.name || 'Unknown').trim();
      const amt = Math.round(Math.abs(Number(tx.amount)));
      if (amt === 0) return;
      const key = merchant + '|' + amt;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    // Find groups with at least 3 transactions spaced ~monthly
    const recurring = [];
    Object.values(groups).forEach(txs => {
      if (txs.length < 3) return;
      // Sort by date
      const sorted = txs.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      // Check intervals
      let intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const d1 = new Date(sorted[i - 1].date);
        const d2 = new Date(sorted[i].date);
        const diff = Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
        intervals.push(diff);
      }
      // If most intervals are 28-32 days, consider recurring
      const monthlyish = intervals.filter(d => d >= 27 && d <= 33).length >= Math.max(1, Math.floor(intervals.length * 0.7));
      if (monthlyish) {
        recurring.push({
          merchant: sorted[0].merchant_name || sorted[0].name || 'Unknown',
          amount: Math.abs(sorted[0].amount),
          count: sorted.length,
          lastDate: sorted[sorted.length - 1].date,
          frequency: 'Monthly',
        });
      }
    });
    return recurring;
  }, [filteredTransactions]);

  // Utility to format dates for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Utility to export transactions to CSV
  const exportTransactionsToCSV = () => {
    if (!filteredTransactions.length) return;
    const txs = filteredTransactions;
    const headers = ['Date', 'Description', 'Category', 'Amount'];
    const rows = txs.map(tx => [
      tx.date,
      tx.merchant_name || tx.name,
      tx.category_display || 'Uncategorized',
      tx.amount_display || tx.amount
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Utility to export transactions to Excel
  const exportTransactionsToExcel = () => {
    if (!filteredTransactions.length) return;
    const wsData = [
      ['Date', 'Description', 'Category', 'Amount'],
      ...filteredTransactions.map(tx => [
        tx.date,
        tx.merchant_name || tx.name,
        tx.category_display || 'Uncategorized',
        tx.amount_display || tx.amount
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions-${Date.now()}.xlsx`);
  };

  // Custom category grouping mapping (moved outside to avoid dependency issues)
  const categoryGroupMap = useMemo(() => ({
    'Groceries': 'Essentials',
    'Rent': 'Essentials',
    'Utilities': 'Essentials',
    'Healthcare': 'Essentials',
    'Insurance': 'Essentials',
    'Dining': 'Discretionary',
    'Shopping': 'Discretionary',
    'Entertainment': 'Discretionary',
    'Travel': 'Discretionary',
    'Subscriptions': 'Discretionary',
  }), []);

  // Compute spending by group
  const groupSpending = useMemo(() => {
    if (!filteredTransactions.length) return null;
    const groupTotals = {};
    filteredTransactions.forEach(tx => {
      if (tx.amount > 0) {
        const cat = tx.category_display || 'Uncategorized';
        const group = categoryGroupMap[cat] || 'Other';
        groupTotals[group] = (groupTotals[group] || 0) + tx.amount;
      }
    });
    return groupTotals;
  }, [filteredTransactions, categoryGroupMap]);
  const groupPieData = groupSpending && Object.keys(groupSpending).length > 0 ? {
    labels: Object.keys(groupSpending),
    datasets: [
      {
        data: Object.values(groupSpending),
        backgroundColor: [
          '#1976d2', '#fbc02d', '#7b1fa2', '#388e3c', '#d32f2f', '#0288d1', '#ffa000', '#c2185b', '#0288d1', '#388e3c'
        ],
      },
    ],
  } : null;

  // Default chart options
  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations to prevent timing issues
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    onResize: (chart, size) => {
      // Handle resize events safely
      try {
        if (chart && size && chart.canvas && chart.canvas.parentNode) {
          chart.update('none');
        }
      } catch (error) {
        console.warn('Chart resize error:', error);
      }
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations to prevent timing issues
    plugins: {
      legend: {
        position: 'right',
      },
    },
    onResize: (chart, size) => {
      // Handle resize events safely
      try {
        if (chart && size && chart.canvas && chart.canvas.parentNode) {
          chart.update('none');
        }
      } catch (error) {
        console.warn('Chart resize error:', error);
      }
    },
  };

  // Generate year-to-date monthly spending data
  const monthlySpendingYTD = useMemo(() => {
    if (!dashboard || !dashboard.recent_transactions) return [];

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize months from January to current month
    const monthlyData = [];
    for (let i = 0; i <= currentMonth; i++) {
      monthlyData.push({
        month: monthNames[i],
        amount: 0,
        monthIndex: i
      });
    }

    // Process transactions to calculate monthly spending
    dashboard.recent_transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      const amount = parseFloat(transaction.amount) || 0;

      // Only include transactions from current year and positive amounts (expenses)
      if (transactionYear === currentYear && transactionMonth <= currentMonth && amount > 0) {
        const monthData = monthlyData.find(m => m.monthIndex === transactionMonth);
        if (monthData) {
          monthData.amount += amount;
        }
      }
    });

    return monthlyData;
  }, [dashboard]);

  // Chart data for monthly spending YTD
  const monthlySpendingChartData = useMemo(() => {
    if (!monthlySpendingYTD.length) return null;

    return {
      labels: monthlySpendingYTD.map(item => item.month),
      datasets: [{
        label: 'Monthly Spending',
        data: monthlySpendingYTD.map(item => item.amount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  }, [monthlySpendingYTD]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `$${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '$' + (value / 1000).toFixed(0) + 'k';
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Generate year-to-date monthly net income data
  const monthlyNetIncomeYTD = useMemo(() => {
    if (!dashboard || !dashboard.recent_transactions) return [];

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize months from January to current month
    const monthlyData = [];
    for (let i = 0; i <= currentMonth; i++) {
      monthlyData.push({
        month: monthNames[i],
        income: 0,
        expenses: 0,
        netIncome: 0,
        monthIndex: i
      });
    }

    // Process transactions to calculate monthly income and expenses
    dashboard.recent_transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      const amount = parseFloat(transaction.amount) || 0;

      // Only include transactions from current year
      if (transactionYear === currentYear && transactionMonth <= currentMonth) {
        const monthData = monthlyData.find(m => m.monthIndex === transactionMonth);
        if (monthData) {
          if (amount > 0) {
            // Positive amounts are expenses
            monthData.expenses += amount;
          } else {
            // Negative amounts are income (deposits, payments, etc.)
            monthData.income += Math.abs(amount);
          }
        }
      }
    });

    // Calculate net income for each month
    monthlyData.forEach(month => {
      month.netIncome = month.income - month.expenses;
    });

    return monthlyData;
  }, [dashboard]);

  // Chart data for monthly net income YTD
  const monthlyNetIncomeChartData = useMemo(() => {
    if (!monthlyNetIncomeYTD.length) return null;

    return {
      labels: monthlyNetIncomeYTD.map(item => item.month),
      datasets: [{
        label: 'Net Income',
        data: monthlyNetIncomeYTD.map(item => item.netIncome),
        backgroundColor: monthlyNetIncomeYTD.map(item =>
          item.netIncome >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: monthlyNetIncomeYTD.map(item =>
          item.netIncome >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  }, [monthlyNetIncomeYTD]);

  const netIncomeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            return `Net Income: ${value >= 0 ? '+' : ''}$${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return (value >= 0 ? '+' : '') + '$' + (Math.abs(value) / 1000).toFixed(0) + 'k';
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // State for tracking category updates
  const [categoryUpdates, setCategoryUpdates] = useState({});
  const categoryUpdateTimeouts = useRef({});

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
        await api.patch(`${FINANCE_BASE_PATH}/transactions/${transactionId}/update_category/`, {
          category: newCategory || null
        });

        // Update the dashboard state
        setDashboard(prevDashboard => ({
          ...prevDashboard,
          recent_transactions: prevDashboard.recent_transactions.map(tx =>
            (tx.id === transactionId || tx.transaction_id === transactionId)
              ? { ...tx, user_category: newCategory }
              : tx
          )
        }));

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

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(categoryUpdateTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return (
    <DashboardContainer>
      {dashLoading && <LoadingOverlay>Loading dashboard...</LoadingOverlay>}
      {error && <ErrorOverlay>{error}</ErrorOverlay>}

      <Paper elevation={0} sx={{
        padding: '12px',
        marginBottom: '16px',
        background: 'rgba(26, 26, 46, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '12px',
        '& .MuiInputBase-root': {
          color: '#fff',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(99, 102, 241, 0.3)',
        },
        '& .MuiInputLabel-root': {
          color: 'rgba(255, 255, 255, 0.6)',
        },
        '& .MuiSelect-icon': {
          color: 'rgba(255, 255, 255, 0.5)',
        },
        '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(99, 102, 241, 0.5)',
        },
        '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#6366f1',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: '#818cf8',
        },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          {/* Single row with all filters - fills full width */}
          <FormControl sx={{ flex: 1, minWidth: 140 }}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </FormControl>
          <FormControl sx={{ flex: 1, minWidth: 140 }}>
            <TextField
              label="End Date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </FormControl>
          <FormControl sx={{ flex: 1.2, minWidth: 150 }} size="small">
            <InputLabel>Institution</InputLabel>
            <Select
              value={filters.institution}
              label="Institution"
              onChange={(e) => setFilters(prev => ({ ...prev, institution: e.target.value, account: '' }))}
              fullWidth
            >
              <MenuItem value=""><em>All Institutions</em></MenuItem>
              {Array.isArray(institutions) ? institutions.map(inst => <MenuItem key={inst.id || inst.plaid_institution_id} value={inst.plaid_institution_id}>{inst.name}</MenuItem>) : []}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1, minWidth: 130 }} size="small">
            <InputLabel>Account</InputLabel>
            <Select
              value={filters.account}
              label="Account"
              onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))}
              disabled={!filters.institution && accountsList.length > 0}
              fullWidth
            >
              <MenuItem value=""><em>All Accounts</em></MenuItem>
              {Array.isArray(accountsList) ? accountsList
                .filter(acc => !filters.institution || acc.institution_id === filters.institution || (acc.institution && acc.institution.plaid_institution_id === filters.institution))
                .map(acc => <MenuItem key={acc.id || acc.plaid_account_id} value={acc.plaid_account_id}>{acc.name}</MenuItem>) : []}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1, minWidth: 120 }} size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              label="Category"
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              fullWidth
            >
              <MenuItem value=""><em>All Categories</em></MenuItem>
              {Array.isArray(categories) ? categories.map(cat => <MenuItem key={cat.id || cat.name} value={cat.name}>{cat.name}</MenuItem>) : []}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TilesContainer>
        <TileRow>
          <TileWrapper>
            <WidgetCard sx={{ height: '420px !important', width: '100%', minHeight: '420px' }}>
              <ChartTitle>Spending by Month (Year to Date)</ChartTitle>
              <ChartContainer ref={monthlySpendingContainerRef}>
                {monthlySpendingChartData ? (
                  <Bar
                    ref={monthlySpendingRef}
                    data={monthlySpendingChartData}
                    options={chartOptions}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '280px',
                    color: '#6b7280'
                  }}>
                    <Typography>No spending data available</Typography>
                  </Box>
                )}
              </ChartContainer>
            </WidgetCard>
          </TileWrapper>

          <TileWrapper>
            <WidgetCard sx={{ height: '420px !important', width: '100%', minHeight: '420px' }}>
              <ChartTitle>Net Income by Month (Year to Date)</ChartTitle>
              <ChartContainer ref={monthlyNetIncomeContainerRef}>
                {monthlyNetIncomeChartData ? (
                  <Bar
                    ref={monthlyNetIncomeRef}
                    data={monthlyNetIncomeChartData}
                    options={netIncomeChartOptions}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '280px',
                    color: '#6b7280'
                  }}>
                    <Typography>No income data available</Typography>
                  </Box>
                )}
              </ChartContainer>
            </WidgetCard>
          </TileWrapper>
        </TileRow>

        <TileRow>
          <TileWrapper>
            <WidgetCard sx={{ height: '420px !important', width: '100%', minHeight: '420px' }}>
              <ChartTitle>Top Spending Categories</ChartTitle>
              <ChartContainer ref={spendingChartContainerRef}>
                {topSpendingCategories.length > 0 ? (
                  <div style={{ width: '100%', overflowY: 'auto', maxHeight: '320px' }}>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '12px 16px', color: '#1976d2', fontWeight: 600, background: '#f4f6fa' }}>
                            Category
                          </th>
                          <th style={{ textAlign: 'right', padding: '12px 16px', color: '#1976d2', fontWeight: 600, background: '#f4f6fa' }}>
                            Amount
                          </th>
                          <th style={{ textAlign: 'right', padding: '12px 16px', color: '#1976d2', fontWeight: 600, background: '#f4f6fa' }}>
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSpendingCategories.map((category, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>
                              {category.name}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                              ${category.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 500, color: '#6b7280' }}>
                              {category.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </StyledTable>
                  </div>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#6b7280'
                  }}>
                    <Typography>No spending data available</Typography>
                  </Box>
                )}
              </ChartContainer>
            </WidgetCard>
          </TileWrapper>

          <TileWrapper>
            <WidgetCard sx={{ height: '420px !important', width: '100%', minHeight: '420px' }}>
              <ChartTitle>Category Breakdown</ChartTitle>
              <ChartContainer ref={categoryPieContainerRef}>
                {renderChart(Pie, spendingPieData, pieChartOptions, categoryPieRef, categoryPieContainerRef, `category-pie-${JSON.stringify(filters)}-${dateRange.start}-${dateRange.end}`)}
              </ChartContainer>
            </WidgetCard>
          </TileWrapper>
        </TileRow>
      </TilesContainer>

      {/* Transactions Table */}
      <TransactionCard style={{ marginTop: '16px' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
          Recent Transactions
        </Typography>

        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          '& .MuiInputBase-root': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99, 102, 241, 0.3)' },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
        }}>
          <TextField
            label="Search Description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '180px' }}
          />
          <TextField
            label="Min Amount"
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '120px' }}
          />
          <TextField
            label="Max Amount"
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: '120px' }}
          />
          <Button
            onClick={() => {
              setSearch('');
              setMinAmount('');
              setMaxAmount('');
              setSortConfig({ key: 'date', direction: 'desc' });
              setCurrentPage(1);
            }}
            variant="outlined"
            size="small"
            sx={{ height: '40px' }}
          >
            Clear Filters
          </Button>
        </Box>

        <Box sx={{ marginBottom: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {filteredTransactions.length === dashboard?.recent_transactions?.length
              ? `Showing all ${filteredTransactions.length} transactions`
              : `Showing ${filteredTransactions.length} of ${dashboard?.recent_transactions?.length || 0} transactions`
            }
            {sortConfig.key && (
              <span> • Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})</span>
            )}
          </Typography>
        </Box>

        <div style={{ maxHeight: '400px', overflowY: 'auto', flex: 1 }}>
          {filteredTransactions.length > 0 ? (
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
                {paginatedTransactions.map(tx => (
                  <tr key={tx.id || tx.transaction_id}>
                    <td>{formatDate(tx.date)}</td>
                    <td>{tx.merchant_name || tx.name}</td>
                    <td>{tx.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}</td>
                    <td>
                      <TextField
                        value={categoryUpdates[tx.id || tx.transaction_id] ?? tx.user_category ?? ''}
                        onChange={(e) => handleUpdateUserCategory(tx.id || tx.transaction_id, e.target.value)}
                        placeholder="Set custom category..."
                        size="small"
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
                    </td>
                    <td>{tx.amount_display || `$${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          ) : (
            <Typography>No transactions found for the selected criteria.</Typography>
          )}

          {/* Pagination Controls */}
          {filteredTransactions.length > transactionsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <Typography variant="body2">
                Showing {Math.min((currentPage - 1) * transactionsPerPage + 1, filteredTransactions.length)} - {Math.min(currentPage * transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
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
        </div>
      </TransactionCard>
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 16px;
  width: 100%;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ErrorOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: red;
  font-weight: bold;
`;

const WidgetCard = styled.div`
  background: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(99, 102, 241, 0.2);
  height: 380px !important;
  min-height: 380px !important;
  max-height: 380px !important;
  display: flex;
  flex-direction: column;
  width: 100% !important;
  box-sizing: border-box;
`;

const ChartContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'theme',
})`
  width: 100%;
  position: relative;
  overflow: hidden;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
`;

const ChartTitle = styled(Typography)`
  margin-bottom: 12px !important;
  font-weight: 600 !important;
  font-size: 1.125rem !important;
  color: #fff !important;
  line-height: 1.5 !important;
`;

const ChartContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
`;

const TransactionCard = styled.div`
  background: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(99, 102, 241, 0.2);
  height: 600px;
  display: flex;
  flex-direction: column;
  min-width: 320px;
`;

const TransactionList = styled.ul`
  list-style-type: none;
  padding-left: 0;
`;

const TransactionItem = styled.li`
  margin-bottom: 8px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  th, td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(99, 102, 241, 0.15);
    color: rgba(255, 255, 255, 0.8);
  }
  th {
    color: #818cf8;
    font-weight: 600;
    background: rgba(99, 102, 241, 0.1);
  }
`;

const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px !important;
  
  &:hover {
    background: rgba(99, 102, 241, 0.2) !important;
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

const TilesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const TileRow = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const TileWrapper = styled.div`
  flex: 1;
  width: 50%;
  min-width: 0;
  
  @media (max-width: 900px) {
    width: 100%;
  }
`;

export default FinanceDashboard; 
