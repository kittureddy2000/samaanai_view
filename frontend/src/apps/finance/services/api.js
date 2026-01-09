import api from '../../../common/auth/services/api';

export const FINANCE_BASE_PATH = '/api/finance';
const withBase = (path = '') => `${FINANCE_BASE_PATH}${path}`;

const handleError = (error, fallbackMessage) => {
  console.error(fallbackMessage, error.response?.data || error.message);
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Unable to connect to the backend server. Please ensure Django is running on port 8000.');
  }
  throw error.response?.data || new Error(fallbackMessage);
};

export const getDashboardData = async (params = {}) => {
  try {
    const response = await api.get(withBase('/dashboard/'), { params });
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch dashboard data');
  }
};

export const getInstitutions = async () => {
  try {
    const response = await api.get(withBase('/institutions/'));
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching institutions');
  }
};

export const createLinkToken = async (includeInvestments = true) => {
  const response = await api.post(withBase('/plaid/create-link-token/'), {
    include_investments: includeInvestments,
  });
  return response.data;
};

export const exchangePublicToken = async (publicToken, institutionId, institutionName, accounts = []) => {
  const payload = {
    public_token: publicToken,
    institution_id: institutionId,
    institution_name: institutionName,
    accounts,
  };
  const response = await api.post(withBase('/plaid/exchange-public-token/'), payload);
  return response.data;
};

export const getAccounts = async () => {
  try {
    const response = await api.get(withBase('/accounts/'));
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching accounts');
  }
};

export const getSpendingCategories = async () => {
  try {
    const response = await api.get(withBase('/spending-categories/'));
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching categories');
  }
};

export const refreshAccountBalances = async () => {
  try {
    const institutionsResponse = await getInstitutions();
    const institutions = institutionsResponse.results || institutionsResponse;

    await Promise.all(
      institutions.map(institution =>
        api.post(withBase(`/institutions/${institution.id}/update_balances/`))
      )
    );

    const freshInstitutionsResponse = await getInstitutions();
    const freshInstitutions = freshInstitutionsResponse.results || freshInstitutionsResponse;
    return freshInstitutions.flatMap(inst =>
      (inst.accounts || []).map(acc => ({ ...acc, institution: inst }))
    );
  } catch (error) {
    handleError(error, 'Error refreshing account balances');
  }
};

export const getHoldings = async (params = {}) => {
  try {
    const response = await api.get(withBase('/holdings/'), { params });
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching holdings');
  }
};

export const getInvestmentTransactions = async (params = {}) => {
  try {
    const response = await api.get(withBase('/investment-transactions/'), { params });
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching investment transactions');
  }
};

export const upgradeInstitutionForInvestments = async (institutionId) => {
  try {
    const response = await api.post(withBase(`/institutions/${institutionId}/upgrade_for_investments/`));
    return response.data;
  } catch (error) {
    handleError(error, 'Error upgrading institution for investments');
  }
};

// Get transactions with optional filtering
export const getTransactions = async (params = {}) => {
  try {
    const response = await api.get(withBase('/transactions/'), { params });
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching transactions');
  }
};

// Manually sync transactions for an institution
export const syncInstitutionTransactions = async (institutionId) => {
  try {
    const response = await api.post(withBase(`/institutions/${institutionId}/sync_transactions/`));
    return response.data;
  } catch (error) {
    handleError(error, 'Error syncing transactions');
  }
};

// Create a link token for updating/reconnecting an institution
export const createUpdateLinkToken = async (institutionId) => {
  try {
    const response = await api.post(withBase(`/institutions/${institutionId}/create_update_link_token/`));
    return response.data;
  } catch (error) {
    handleError(error, 'Error creating update link token');
  }
};

// Delete/unlink an institution
export const deleteInstitution = async (institutionId) => {
  try {
    const response = await api.delete(withBase(`/institutions/${institutionId}/`));
    return response.data;
  } catch (error) {
    handleError(error, 'Error removing institution');
  }
};

// Create a manual transaction
export const createTransaction = async (transactionData) => {
  try {
    const response = await api.post(withBase('/transactions/create_manual/'), transactionData);
    return response.data;
  } catch (error) {
    handleError(error, 'Error creating transaction');
  }
};

// Toggle exclude from reports for a transaction
export const toggleExcludeFromReports = async (transactionId, exclude = null) => {
  try {
    const data = exclude !== null ? { exclude } : {};
    const response = await api.patch(withBase(`/transactions/${transactionId}/toggle_exclude_from_reports/`), data);
    return response.data;
  } catch (error) {
    handleError(error, 'Error updating transaction');
  }
};

// Update custom name for an account
export const updateAccountCustomName = async (accountId, customName) => {
  try {
    const response = await api.patch(withBase(`/accounts/${accountId}/update_custom_name/`), {
      custom_name: customName
    });
    return response.data;
  } catch (error) {
    handleError(error, 'Error updating account custom name');
  }
};

export default api;
