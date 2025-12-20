import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { getDashboardData, getInstitutions, getSpendingCategories } from '../../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const ReportsSettings = ({ accounts }) => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [filters, setFilters] = useState({
        institution: '',
        account: '',
        category: ''
    });
    const [institutions, setInstitutions] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardData, institutionsData, categoriesData] = await Promise.all([
                    getDashboardData({ start_date: dateRange.start, end_date: dateRange.end, institution: filters.institution, account: filters.account, category: filters.category }),
                    getInstitutions(),
                    getSpendingCategories()
                ]);
                setDashboard(dashboardData);
                setInstitutions(institutionsData?.results || institutionsData || []);
                setCategories(categoriesData?.results || categoriesData || []);
            } catch (error) {
                console.error('Error fetching reports data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateRange, filters]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                ticks: { color: 'rgba(255,255,255,0.6)' },
                grid: { color: 'rgba(99, 102, 241, 0.1)' }
            },
            y: {
                ticks: { color: 'rgba(255,255,255,0.6)', callback: (v) => `$${v.toLocaleString()}` },
                grid: { color: 'rgba(99, 102, 241, 0.1)' }
            }
        }
    };

    const monthlySpendingChartData = dashboard?.monthly_spending ? {
        labels: Object.keys(dashboard.monthly_spending),
        datasets: [{
            data: Object.values(dashboard.monthly_spending),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1
        }]
    } : null;

    const categoryBreakdownData = dashboard?.category_breakdown ? {
        labels: dashboard.category_breakdown.map(c => c.category),
        datasets: [{
            data: dashboard.category_breakdown.map(c => c.total),
            backgroundColor: [
                '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
                '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3'
            ],
            borderWidth: 0
        }]
    } : null;

    return (
        <ReportsContainer>
            <ReportsHeader>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    Financial Reports
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    View spending patterns and financial analytics over custom date ranges
                </Typography>
            </ReportsHeader>

            {/* Filters */}
            <FilterBar>
                <FormControl sx={{ minWidth: 140 }}>
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
                <FormControl sx={{ minWidth: 140 }}>
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
                <FormControl sx={{ minWidth: 150 }} size="small">
                    <InputLabel>Institution</InputLabel>
                    <Select
                        value={filters.institution}
                        label="Institution"
                        onChange={(e) => setFilters(prev => ({ ...prev, institution: e.target.value }))}
                    >
                        <MenuItem value=""><em>All</em></MenuItem>
                        {institutions.map(inst => (
                            <MenuItem key={inst.id || inst.plaid_institution_id} value={inst.plaid_institution_id}>
                                {inst.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 130 }} size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                        value={filters.category}
                        label="Category"
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <MenuItem value=""><em>All</em></MenuItem>
                        {categories.map(cat => (
                            <MenuItem key={cat.id || cat.name} value={cat.name}>{cat.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </FilterBar>

            {/* Charts */}
            <ChartsGrid>
                <ChartCard>
                    <ChartTitle>Spending by Month</ChartTitle>
                    <ChartContainer>
                        {monthlySpendingChartData ? (
                            <Bar data={monthlySpendingChartData} options={chartOptions} />
                        ) : (
                            <NoDataText>No spending data available</NoDataText>
                        )}
                    </ChartContainer>
                </ChartCard>

                <ChartCard>
                    <ChartTitle>Category Breakdown</ChartTitle>
                    <ChartContainer>
                        {categoryBreakdownData ? (
                            <Pie data={categoryBreakdownData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }} />
                        ) : (
                            <NoDataText>No category data available</NoDataText>
                        )}
                    </ChartContainer>
                </ChartCard>
            </ChartsGrid>

            {/* Summary Stats */}
            <SummaryGrid>
                <SummaryStat>
                    <StatLabel>Total Spending</StatLabel>
                    <StatValue>${(dashboard?.total_spending || 0).toLocaleString()}</StatValue>
                </SummaryStat>
                <SummaryStat>
                    <StatLabel>Total Income</StatLabel>
                    <StatValue style={{ color: '#10b981' }}>${(dashboard?.total_income || 0).toLocaleString()}</StatValue>
                </SummaryStat>
                <SummaryStat>
                    <StatLabel>Net Income</StatLabel>
                    <StatValue style={{ color: (dashboard?.net_income || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                        ${(dashboard?.net_income || 0).toLocaleString()}
                    </StatValue>
                </SummaryStat>
                <SummaryStat>
                    <StatLabel>Transactions</StatLabel>
                    <StatValue>{dashboard?.recent_transactions?.length || 0}</StatValue>
                </SummaryStat>
            </SummaryGrid>
        </ReportsContainer>
    );
};

const ReportsContainer = styled.div`
  padding: 0;
`;

const ReportsHeader = styled.div`
  margin-bottom: 24px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  
  & .MuiInputBase-root {
    color: #fff;
    background: rgba(255,255,255,0.05);
  }
  & .MuiOutlinedInput-notchedOutline {
    border-color: rgba(99, 102, 241, 0.3);
  }
  & .MuiInputLabel-root {
    color: rgba(255,255,255,0.6);
  }
  & .MuiSelect-icon {
    color: rgba(255,255,255,0.5);
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const ChartCard = styled.div`
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
  min-height: 350px;
`;

const ChartTitle = styled.h3`
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const ChartContainer = styled.div`
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NoDataText = styled.div`
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
`;

const SummaryStat = styled.div`
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
`;

const StatLabel = styled.div`
  color: rgba(255,255,255,0.6);
  font-size: 0.85rem;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
`;

export default ReportsSettings;
