import React, { useState, useMemo, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Box, Typography, Breadcrumbs, Link, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { Home as HomeIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import styled from 'styled-components';

// Register Chart.js components and datalabels plugin
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const DrilldownContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const BreadcrumbContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
`;

const ChartWrapper = styled(Box)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  position: relative;
`;

const CategoryLegend = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
`;

const LegendItem = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(99, 102, 241, 0.2);
  }
`;

const ColorDot = styled(Box)`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.color};
  flex-shrink: 0;
`;

// Define category hierarchy based on Plaid categories
const CATEGORY_HIERARCHY = {
    'FOOD_AND_DRINK': {
        name: 'Food & Drink',
        children: ['RESTAURANTS', 'FAST_FOOD', 'COFFEE_SHOP', 'GROCERIES', 'BEER_WINE_AND_LIQUOR']
    },
    'TRANSFER_OUT': {
        name: 'Transfers',
        children: ['ATM', 'BANK_FEES_AND_CHARGES', 'FINANCE_CHARGE']
    },
    'LOAN_PAYMENTS': {
        name: 'Loan Payments',
        children: ['MORTGAGE', 'STUDENT_LOAN', 'CAR_PAYMENT', 'CREDIT_CARD_PAYMENT']
    },
    'PERSONAL_CARE': {
        name: 'Personal Care',
        children: ['SPA', 'HAIR', 'GYM']
    },
    'RENT_AND_UTILITIES': {
        name: 'Rent & Utilities',
        children: ['RENT', 'ELECTRIC', 'GAS', 'WATER', 'INTERNET', 'PHONE']
    },
    'ENTERTAINMENT': {
        name: 'Entertainment',
        children: ['MOVIES', 'MUSIC', 'GAMES', 'STREAMING']
    },
    'SHOPPING': {
        name: 'Shopping',
        children: ['CLOTHING', 'ELECTRONICS', 'GENERAL_MERCHANDISE', 'ONLINE_SHOPPING']
    },
    'TRANSPORTATION': {
        name: 'Transportation',
        children: ['GAS_STATIONS', 'PARKING', 'PUBLIC_TRANSIT', 'RIDESHARE', 'CAR_RENTAL']
    },
    'TRAVEL': {
        name: 'Travel',
        children: ['AIRLINES', 'HOTELS', 'CAR_RENTAL']
    }
};

const SpendingCategoryDrilldown = ({ spendingData = [], transactions = [], onCategorySelect }) => {
    const [drillPath, setDrillPath] = useState([]);
    const chartRef = useRef();

    const categoryColors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
        '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f43f5e',
        '#14b8a6', '#a855f7', '#fb923c', '#22c55e', '#0ea5e9'
    ];

    // Format category name for display
    const formatCategoryName = (category) => {
        if (!category) return 'Uncategorized';
        return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get current level data based on drill path
    const currentData = useMemo(() => {
        if (!spendingData || spendingData.length === 0) {
            // If no spending data provided, calculate from transactions
            if (!transactions || transactions.length === 0) return [];

            const categoryTotals = {};
            transactions.forEach(tx => {
                if (tx.amount > 0) { // Only expenses
                    const category = tx.primary_category || 'OTHER';
                    categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(tx.amount);
                }
            });

            return Object.entries(categoryTotals)
                .map(([name, total]) => ({ primary_category: name, total }))
                .sort((a, b) => b.total - a.total);
        }

        if (drillPath.length === 0) {
            // Root level - show parent categories
            return spendingData.filter(cat => cat.total > 0);
        } else {
            // Drilled into a category - try to break down by transaction details
            const parentCategory = drillPath[drillPath.length - 1];

            // Filter transactions for this category and group by merchant
            const merchantTotals = {};
            transactions.forEach(tx => {
                if (tx.amount > 0 && tx.primary_category === parentCategory) {
                    const merchant = tx.merchant_name || tx.name || 'Unknown';
                    merchantTotals[merchant] = (merchantTotals[merchant] || 0) + Math.abs(tx.amount);
                }
            });

            return Object.entries(merchantTotals)
                .map(([name, total]) => ({ primary_category: name, total, isMerchant: true }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10); // Top 10 merchants
        }
    }, [spendingData, transactions, drillPath]);

    const chartData = useMemo(() => {
        if (!currentData.length) return null;

        return {
            labels: currentData.map(cat => formatCategoryName(cat.primary_category)),
            datasets: [{
                data: currentData.map(cat => cat.total),
                backgroundColor: currentData.map((_, i) => categoryColors[i % categoryColors.length]),
                borderWidth: 2,
                borderColor: '#1e1e2e',
                hoverBorderColor: '#fff',
                hoverBorderWidth: 3,
            }]
        };
    }, [currentData]);

    const handleChartClick = (event, elements) => {
        if (elements.length === 0) return;

        const clickedIndex = elements[0].index;
        const clickedCategory = currentData[clickedIndex];

        if (!clickedCategory) return;

        // Only drill down if at root level and there are transactions to analyze
        if (drillPath.length === 0 && !clickedCategory.isMerchant && transactions.length > 0) {
            setDrillPath([clickedCategory.primary_category]);
        }

        if (onCategorySelect) {
            onCategorySelect(clickedCategory);
        }
    };

    const handleBack = () => {
        if (drillPath.length > 0) {
            setDrillPath(prev => prev.slice(0, -1));
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `$${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            },
            datalabels: {
                color: '#fff',
                font: {
                    weight: 'bold',
                    size: 11
                },
                formatter: (value, context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                    // Only show label if slice is big enough (> 5%)
                    if (percentage < 5) return '';
                    const label = context.chart.data.labels[context.dataIndex];
                    // Truncate long labels
                    const shortLabel = label.length > 12 ? label.substring(0, 10) + '...' : label;
                    return `${shortLabel}\n${percentage}%`;
                },
                textAlign: 'center',
                anchor: 'center',
                align: 'center',
                offset: 0,
                display: (context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const value = context.dataset.data[context.dataIndex];
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return percentage >= 5; // Only display if >= 5%
                }
            }
        },
        onClick: handleChartClick,
    };

    const totalSpending = currentData.reduce((sum, cat) => sum + (cat.total || 0), 0);

    return (
        <DrilldownContainer>
            {drillPath.length > 0 && (
                <BreadcrumbContainer>
                    <MuiTooltip title="Go back">
                        <IconButton size="small" onClick={handleBack} sx={{ color: '#6366f1' }}>
                            <BackIcon fontSize="small" />
                        </IconButton>
                    </MuiTooltip>
                    <Breadcrumbs separator="›" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                        <Link
                            component="button"
                            underline="hover"
                            onClick={() => setDrillPath([])}
                            sx={{ color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <HomeIcon fontSize="small" />
                            All Categories
                        </Link>
                        {drillPath.map((cat, index) => (
                            <Typography key={index} sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                {formatCategoryName(cat)}
                            </Typography>
                        ))}
                    </Breadcrumbs>
                </BreadcrumbContainer>
            )}

            <ChartWrapper>
                {chartData ? (
                    <Pie ref={chartRef} data={chartData} options={chartOptions} />
                ) : (
                    <Typography color="text.secondary">No spending data for this period</Typography>
                )}
            </ChartWrapper>

            {currentData.length > 0 && (
                <CategoryLegend>
                    {currentData.slice(0, 8).map((cat, index) => {
                        const percentage = totalSpending > 0 ? ((cat.total / totalSpending) * 100).toFixed(1) : 0;
                        const canDrillDown = drillPath.length === 0 && !cat.isMerchant && transactions.length > 0;

                        return (
                            <LegendItem
                                key={cat.primary_category}
                                onClick={() => {
                                    if (canDrillDown) {
                                        setDrillPath([cat.primary_category]);
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={categoryColors[index % categoryColors.length]} />
                                    <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8rem' }}>
                                        {formatCategoryName(cat.primary_category)}
                                        {canDrillDown && (
                                            <span style={{ opacity: 0.5, marginLeft: 4 }}>→</span>
                                        )}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                                    ${cat.total.toLocaleString()} ({percentage}%)
                                </Typography>
                            </LegendItem>
                        );
                    })}
                </CategoryLegend>
            )}
        </DrilldownContainer>
    );
};

export default SpendingCategoryDrilldown;
