import { api } from '../../../common/auth';

// Helper function to format dates consistently
const formatDateForAPI = (date) => {
  // Convert Date object to YYYY-MM-DD format in local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;
  
  return formatted;
};

export const nutritionService = {
  // Daily Report (replaces getDailyEntry)
  getDailyReport: async (date) => {
    const formattedDate = formatDateForAPI(date);
    
    // Now we need to include /api prefix since baseURL no longer includes it
    const url = `/api/samaanai/reports/daily?date=${formattedDate}`;
    const response = await api.get(url);
    return response.data;
  },
  
  // Meal entries
  // For adding a new meal. Assumes the backend handles if it's an update or create for a given meal_type/date.
  // If not, the frontend logic in DailyEntry.js will need to be more specific about PUT vs POST.
  addOrUpdateMealEntry: async (mealData) => {
    // Ensure date is formatted consistently if present in mealData
    if (mealData.date) {
      mealData.date = formatDateForAPI(new Date(mealData.date));
    }
    
    // If mealData has an ID, it's an update (PUT or PATCH), otherwise it's a create (POST)
    // The backend ViewSet for MealEntry should handle POST for creation.
    // For updates, we might need a specific PUT/PATCH if IDs are known.
    // For simplicity now, assuming POST will create, and DailyEntry.js will manage existing IDs for updates.
    if (mealData.id) {
        const { id, ...data } = mealData;
        const response = await api.put(`/api/samaanai/meals/${id}/`, data);
        return response.data;
    } else {
        const response = await api.post('/api/samaanai/meals/', mealData);
        return response.data;
    }
  },
  
  deleteMealEntry: async (id) => {
    const response = await api.delete(`/api/samaanai/meals/${id}/`);
    return response.data; // Or just status
  },
  
  // Exercise entries
  addOrUpdateExerciseEntry: async (exerciseData) => {
    // Ensure date is formatted consistently if present in exerciseData
    if (exerciseData.date) {
      exerciseData.date = formatDateForAPI(new Date(exerciseData.date));
    }
    
    if (exerciseData.id) {
        const { id, ...data } = exerciseData;
        const response = await api.put(`/api/samaanai/exercises/${id}/`, data);
        return response.data;
    } else {
        const response = await api.post('/api/samaanai/exercises/', exerciseData);
        return response.data;
    }
  },
  
  deleteExerciseEntry: async (id) => {
    const response = await api.delete(`/api/samaanai/exercises/${id}/`);
    return response.data; // Or just status
  },

  // Weight Entries
  getWeightHistory: async (date) => { // Optional date filter, or fetch all for user
    let url = '/api/samaanai/weight-entries/';
    if (date) {
        const formattedDate = formatDateForAPI(date);
        url += `?date=${formattedDate}`;
    }
    const response = await api.get(url);
    return response.data; // Expects a list of weight entries
  },

  addOrUpdateWeightEntry: async (weightData) => {
    // Ensure date is formatted consistently if present in weightData
    if (weightData.date) {
      weightData.date = formatDateForAPI(new Date(weightData.date));
    }
    
    // The WeightEntryViewSet on the backend handles upsert on POST via perform_create.
    // So we can just POST the data. It needs user (from auth), date, and weight.
    // If an ID is present and you want to explicitly PUT:
    if (weightData.id) {
        const { id, ...data } = weightData;
        const response = await api.put(`/api/samaanai/weight-entries/${id}/`, data); 
        return response.data;
    }
    // The backend WeightEntryViewSet handles upsert on POST if unique_together (user,date) is met.
    // If not, this POST will create a new entry.
    const response = await api.post('/api/samaanai/weight-entries/', weightData);
    return response.data;
  },
  
  // Reports (URLs updated)
  getWeeklyReport: async (date) => {
    let params = '';
    if (date) {
      const formattedDate = formatDateForAPI(date);
      params = `?date=${formattedDate}`; // Or start_date based on backend API
    }
    const response = await api.get(`/api/samaanai/reports/weekly${params}`);
    return response.data;
  },
  
  getMonthlyReport: async (month, year) => {
    let params = '';
    if (month && year) {
      params = `?month=${month}&year=${year}`;
    }
    const response = await api.get(`/api/samaanai/reports/monthly${params}`);
    return response.data;
  },
  
  getYearlyReport: async (year) => {
    let params = '';
    if (year) {
      params = `?year=${year}`;
    }
    const response = await api.get(`/api/samaanai/reports/yearly${params}`);
    return response.data;
  }
};

export default nutritionService;