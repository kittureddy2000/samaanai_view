import React, { useEffect, useState } from 'react';
import { getDashboardData } from '../services/api';
import styled from 'styled-components';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../../calorie-tracker/contexts/AuthContext';

const FinanceDashboardPage = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser, logout } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getDashboardData();
                setDashboardData(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                
                // Set more user-friendly error messages
                if (err.message?.includes('Unable to connect to the backend server')) {
                    setError("Cannot connect to the server. Please ensure the Django backend is running on port 8000.");
                } else if (err.response?.status === 401) {
                    setError("You are not authenticated. Please log in again.");
                } else {
                    setError(err.message || "Failed to load dashboard data.");
                }
                
                setDashboardData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Finance Header ---
    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading finance dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
                <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
                <p className="text-red-600">{error}</p>
                {error.includes('Django backend') && (
                    <div className="mt-4 p-4 bg-white rounded border border-red-200">
                        <p className="text-sm text-gray-700 font-semibold mb-2">To start the Django server:</p>
                        <pre className="bg-gray-100 p-2 rounded text-sm">
                            <code>cd /path/to/django/project</code><br/>
                            <code>python manage.py runserver</code>
                        </pre>
                    </div>
                )}
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">No dashboard data available.</p>
            </div>
        );
    }

    // Main dashboard rendering
    return (
        <>
            <FinanceHeader>
                <HeaderContent>
                    <LogoSection>
                        <AccountBalanceWalletIcon sx={{ fontSize: 32, color: '#fff', mr: 1 }} />
                        <HeaderTitle>FinanceTracker</HeaderTitle>
                    </LogoSection>
                    <HeaderActions>
                        {currentUser && (
                            <UserInfo>
                                <span className="material-symbols-outlined">account_circle</span>
                                <span>{currentUser.username}</span>
                            </UserInfo>
                        )}
                        <LogoutButton onClick={handleLogout}>
                            <span className="material-symbols-outlined">logout</span>
                            <span>Logout</span>
                        </LogoutButton>
                    </HeaderActions>
                </HeaderContent>
            </FinanceHeader>
            <MainContent>
                <div className="container mx-auto p-4">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">Finance Dashboard</h1>
                    
                    {/* Net Worth and Cash Flow Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Net Worth</h2>
                            {dashboardData.net_worth ? (
                                <p className="text-3xl font-bold text-green-600">
                                    ${dashboardData.net_worth.net_worth?.toLocaleString() || '0'}
                                </p>
                            ) : (
                                <p className="text-gray-500">No data available</p>
                            )}
                            {dashboardData.net_worth && (
                                <div className="mt-2 text-sm text-gray-600">
                                    <p>Assets: ${dashboardData.net_worth.total_assets?.toLocaleString() || '0'}</p>
                                    <p>Liabilities: ${dashboardData.net_worth.total_liabilities?.toLocaleString() || '0'}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Monthly Cash Flow</h2>
                            {dashboardData.monthly_cash_flow ? (
                                <>
                                    <p className="text-lg text-gray-600">
                                        Income: ${dashboardData.monthly_cash_flow.income?.toLocaleString() || '0'}
                                    </p>
                                    <p className="text-lg text-gray-600">
                                        Expenses: ${dashboardData.monthly_cash_flow.expenses?.toLocaleString() || '0'}
                                    </p>
                                    <p className="text-xl font-semibold text-blue-600 mt-2">
                                        Net: ${dashboardData.monthly_cash_flow.net_cash_flow?.toLocaleString() || '0'}
                                    </p>
                                    {dashboardData.monthly_cash_flow.savings_rate !== undefined && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Savings Rate: {dashboardData.monthly_cash_flow.savings_rate.toFixed(1)}%
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500">No data available</p>
                            )}
                        </div>
                    </div>

                    {/* Institutions */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">Linked Institutions</h2>
                        {dashboardData.institutions && dashboardData.institutions.length > 0 ? (
                            <div className="space-y-3">
                                {dashboardData.institutions.map(inst => (
                                    <div key={inst.id} className="border-b pb-3 last:border-b-0">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-semibold text-gray-800">{inst.name}</span>
                                                <span className={`ml-2 text-sm ${inst.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                    ({inst.is_active ? 'Active' : 'Inactive'})
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{inst.total_balance}</p>
                                                <p className="text-sm text-gray-600">{inst.account_count} accounts</p>
                                            </div>
                                        </div>
                                        {inst.needs_update && (
                                            <p className="text-sm text-orange-600 mt-1">Needs reconnection</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No institutions linked yet. Connect your bank to get started.</p>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">Recent Transactions</h2>
                        {dashboardData.recent_transactions && dashboardData.recent_transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dashboardData.recent_transactions.slice(0, 10).map(tx => (
                                            <tr key={tx.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                    {new Date(tx.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-800">
                                                    <div>
                                                        <p className="font-medium">{tx.merchant_name || tx.name}</p>
                                                        <p className="text-xs text-gray-500">{tx.account_name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                    {tx.category_display || 'Uncategorized'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-right font-medium">
                                                    <span className={tx.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                                                        {tx.amount_display}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-600">No recent transactions.</p>
                        )}
                    </div>

                    {/* Spending by Category */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">Spending by Category (This Month)</h2>
                        {dashboardData.spending_by_category && dashboardData.spending_by_category.length > 0 ? (
                            <div className="space-y-3">
                                {dashboardData.spending_by_category.slice(0, 5).map((cat, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span className="text-gray-700">
                                            {cat.primary_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
                                        </span>
                                        <div className="text-right">
                                            <span className="font-semibold">${cat.total?.toLocaleString() || '0'}</span>
                                            <span className="text-sm text-gray-500 ml-2">({cat.count} transactions)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No spending data for this month yet.</p>
                        )}
                    </div>
                </div>
            </MainContent>
        </>
    );
};

// Styled Components for Finance Header
const FinanceHeader = styled.header`
  background: linear-gradient(90deg, #1976d2 0%, #2196f3 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 60px;
  display: flex;
  align-items: center;
`;

const HeaderContent = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0 0.5rem;
  letter-spacing: 1px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
  span:first-child {
    margin-right: 0.5rem;
    font-size: 1.5rem;
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.2s;
  &:hover {
    opacity: 0.8;
  }
  span:first-child {
    margin-right: 0.5rem;
  }
`;

const MainContent = styled.div`
  margin-top: 60px;
`;

export default FinanceDashboardPage;