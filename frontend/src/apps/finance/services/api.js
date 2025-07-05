import { api } from '../../../common/auth';
import axios from 'axios';

// Main shared API instance (handles auth + token refresh)
const apiClient = api;
const financeApiClient = axios.create({
  baseURL: api.defaults.baseURL,
});

// Base path for finance API endpoints
const BASE_PATH = '/api/finance';

// Ensure every finance request path includes the BASE_PATH
financeApiClient.interceptors.request.use(config => {
  if (config.url && !config.url.startsWith(BASE_PATH)) {
    // Avoid double slashes
    if (!config.url.startsWith('/')) {
      config.url = `/${config.url}`;
    }
    config.url = `${BASE_PATH}${config.url}`;
  }
  return config;
});

// Add simple connection error logging for finance calls
financeApiClient.interceptors.response.use(response => response, error => Promise.reject(error));

/**
 * Fetches dashboard data.
 */
export const getDashboardData = async (params = {}) => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/dashboard/`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching dashboard data:', error.response?.data || error.message);
        
        // Provide more specific error messages
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Unable to connect to the backend server. Please ensure Django is running on port 8000.');
        }
        
        throw error.response?.data || new Error('Failed to fetch dashboard data');
    }
};

// Add other finance-related API functions
export const getInstitutions = async () => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/institutions/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching institutions:', error);
        throw error;
    }
};

export const createLinkToken = async () => {
    const response = await financeApiClient.post(`${BASE_PATH}/plaid/create-link-token/`);
    return response.data;
};

export const exchangePublicToken = async (publicToken, institutionId, institutionName, accounts) => {
    const response = await financeApiClient.post(`${BASE_PATH}/plaid/exchange-public-token/`, {
        public_token: publicToken,
        institution_id: institutionId,
        institution_name: institutionName,
        accounts,
    });
    return response.data;
};

export const getAccounts = async () => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/accounts/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching accounts:', error);
        throw error;
    }
};

export const getSpendingCategories = async () => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/spending-categories/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

export const refreshAccountBalances = async () => {
    try {
        // Get all institutions first
        const institutionsResponse = await getInstitutions();
        const institutions = institutionsResponse.results || institutionsResponse;
        
        // Update balances for each institution
        const refreshPromises = institutions.map(institution => 
            financeApiClient.post(`${BASE_PATH}/institutions/${institution.id}/update_balances/`)
        );
        
        await Promise.all(refreshPromises);
        
        // Return updated institutions and flatten accounts like the main app expects
        const freshInstitutionsResponse = await getInstitutions();
        const freshInstitutions = freshInstitutionsResponse.results || freshInstitutionsResponse;
        const allAccounts = freshInstitutions.flatMap(inst =>
            (inst.accounts || []).map(acc => ({ ...acc, institution: inst }))
        );
        
        return allAccounts;
    } catch (error) {
        console.error('Error refreshing account balances:', error);
        throw error;
    }
};

// Investment API functions
export const getHoldings = async (params = {}) => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/holdings/`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching holdings:', error);
        throw error;
    }
};

export const getInvestmentTransactions = async (params = {}) => {
    try {
        const response = await financeApiClient.get(`${BASE_PATH}/investment-transactions/`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching investment transactions:', error);
        throw error;
    }
};

export const upgradeInstitutionForInvestments = async (institutionId) => {
    try {
        const response = await financeApiClient.post(`${BASE_PATH}/institutions/${institutionId}/upgrade_for_investments/`);
        return response.data;
    } catch (error) {
        console.error('Error upgrading institution for investments:', error);
        throw error;
    }
};

// Export apiClient both as named and default export
export { apiClient, financeApiClient };
export default apiClient;