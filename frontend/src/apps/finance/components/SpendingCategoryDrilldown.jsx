import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { Box, Typography, Breadcrumbs, Link, Chip, IconButton, Tooltip } from '@mui/material';
import { Home as HomeIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import styled from 'styled-components';
import api from '../services/api';

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
  min-height: 250px;
  position: relative;
`;

const CategoryLegend = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
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
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.clickable ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
  }
`;

const ColorDot = styled(Box)`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.color};
  flex-shrink: 0;
`;

const SpendingCategoryDrilldown = ({ dateRange, onCategorySelect }) => {
    const [hierarchicalCategories, setHierarchicalCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Drill-down state
    const [drillPath, setDrillPath] = useState([]); // Array of {id, name} for breadcrumb
    const [currentLevelCategories, setCurrentLevelCategories] = useState([]);

    const chartRef = useRef();

    // Category colors
    const categoryColors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
        '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f43f5e',
        '#14b8a6', '#a855f7', '#fb923c', '#22c55e', '#0ea5e9'
    ];

    // Fetch hierarchical categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/finance/spending-categories/tree/');
                const data = response.data.results || response.data;
                setHierarchicalCategories(Array.isArray(data) ? data : []);
                setCurrentLevelCategories(Array.isArray(data) ? data : []);
                setError(null);
            } catch (err) {
                console.error('Error fetching hierarchical categories:', err);
                setError('Failed to load categories');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Prepare chart data from current level categories
    const chartData = useMemo(() => {
        if (!currentLevelCategories.length) return null;

        // Filter to categories with spending
        const categoriesWithSpending = currentLevelCategories.filter(cat =>
            (cat.total_spending || cat.current_month_spending) > 0
        );

        if (!categoriesWithSpending.length) return null;

        return {
            labels: categoriesWithSpending.map(cat => cat.name),
            datasets: [{
                data: categoriesWithSpending.map(cat => cat.total_spending || cat.current_month_spending || 0),
                backgroundColor: categoriesWithSpending.map((_, i) => categoryColors[i % categoryColors.length]),
                borderWidth: 2,
                borderColor: '#1e1e2e',
                hoverBorderColor: '#fff',
                hoverBorderWidth: 3,
            }]
        };
    }, [currentLevelCategories]);

    // Handle click on pie slice
    const handleChartClick = (event, elements) => {
        if (elements.length === 0) return;

        const clickedIndex = elements[0].index;
        const categoriesWithSpending = currentLevelCategories.filter(cat =>
            (cat.total_spending || cat.current_month_spending) > 0
        );
        const clickedCategory = categoriesWithSpending[clickedIndex];

        if (!clickedCategory) return;

        // If category has children, drill down
        if (clickedCategory.children && clickedCategory.children.length > 0) {
            setDrillPath(prev => [...prev, { id: clickedCategory.id, name: clickedCategory.name }]);
            setCurrentLevelCategories(clickedCategory.children);
        }

        // Notify parent component
        if (onCategorySelect) {
            onCategorySelect(clickedCategory);
        }
    };

    // Handle breadcrumb navigation
    const handleBreadcrumbClick = (index) => {
        if (index === -1) {
            // Click on "All" - go back to root
            setDrillPath([]);
            setCurrentLevelCategories(hierarchicalCategories);
        } else {
            // Navigate to specific level
            const newPath = drillPath.slice(0, index + 1);

            // Find the category at this level
            let categories = hierarchicalCategories;
            for (const pathItem of newPath) {
                const found = categories.find(c => c.id === pathItem.id);
                if (found && found.children) {
                    categories = found.children;
                }
            }

            setDrillPath(newPath);
            setCurrentLevelCategories(categories);
        }
    };

    // Handle back button
    const handleBack = () => {
        if (drillPath.length === 0) return;

        const newPath = drillPath.slice(0, -1);

        if (newPath.length === 0) {
            setCurrentLevelCategories(hierarchicalCategories);
        } else {
            // Navigate to parent level
            let categories = hierarchicalCategories;
            for (const pathItem of newPath) {
                const found = categories.find(c => c.id === pathItem.id);
                if (found && found.children) {
                    categories = found.children;
                }
            }
            setCurrentLevelCategories(categories);
        }

        setDrillPath(newPath);
    };

    // Chart options with click handler
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
            legend: {
                display: false, // We'll use custom legend
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `$${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        },
        onClick: handleChartClick,
    };

    // Calculate totals for legend
    const totalSpending = useMemo(() => {
        return currentLevelCategories.reduce(
            (sum, cat) => sum + (cat.total_spending || cat.current_month_spending || 0),
            0
        );
    }, [currentLevelCategories]);

    if (loading) {
        return (
            <DrilldownContainer>
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Loading categories...
                </Typography>
            </DrilldownContainer>
        );
    }

    if (error) {
        return (
            <DrilldownContainer>
                <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
                    {error}
                </Typography>
            </DrilldownContainer>
        );
    }

    const categoriesWithSpending = currentLevelCategories.filter(cat =>
        (cat.total_spending || cat.current_month_spending) > 0
    );

    return (
        <DrilldownContainer>
            {/* Breadcrumb Navigation */}
            {drillPath.length > 0 && (
                <BreadcrumbContainer>
                    <Tooltip title="Go back">
                        <IconButton size="small" onClick={handleBack} sx={{ color: '#6366f1' }}>
                            <BackIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Breadcrumbs separator="›" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                        <Link
                            component="button"
                            underline="hover"
                            onClick={() => handleBreadcrumbClick(-1)}
                            sx={{ color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <HomeIcon fontSize="small" />
                            All
                        </Link>
                        {drillPath.map((item, index) => (
                            <Link
                                key={item.id}
                                component="button"
                                underline="hover"
                                onClick={() => handleBreadcrumbClick(index)}
                                sx={{
                                    color: index === drillPath.length - 1 ? '#fff' : '#6366f1',
                                    cursor: 'pointer',
                                    fontWeight: index === drillPath.length - 1 ? 600 : 400
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </Breadcrumbs>
                </BreadcrumbContainer>
            )}

            {/* Chart */}
            <ChartWrapper>
                {chartData ? (
                    <Pie ref={chartRef} data={chartData} options={chartOptions} />
                ) : (
                    <Typography color="text.secondary">No spending data for this period</Typography>
                )}
            </ChartWrapper>

            {/* Custom Legend */}
            {categoriesWithSpending.length > 0 && (
                <CategoryLegend>
                    {categoriesWithSpending.map((cat, index) => {
                        const spending = cat.total_spending || cat.current_month_spending || 0;
                        const percentage = totalSpending > 0 ? ((spending / totalSpending) * 100).toFixed(1) : 0;
                        const hasChildren = cat.children && cat.children.length > 0;

                        return (
                            <LegendItem
                                key={cat.id}
                                clickable={hasChildren}
                                onClick={() => {
                                    if (hasChildren) {
                                        setDrillPath(prev => [...prev, { id: cat.id, name: cat.name }]);
                                        setCurrentLevelCategories(cat.children);
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={categoryColors[index % categoryColors.length]} />
                                    <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8rem' }}>
                                        {cat.icon && <span style={{ marginRight: 4 }}>{cat.icon}</span>}
                                        {cat.name}
                                        {hasChildren && (
                                            <Chip
                                                label={`${cat.children.length}`}
                                                size="small"
                                                sx={{ ml: 1, height: 16, fontSize: '0.65rem', bgcolor: 'rgba(99, 102, 241, 0.3)' }}
                                            />
                                        )}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                                    ${spending.toLocaleString()} ({percentage}%)
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
