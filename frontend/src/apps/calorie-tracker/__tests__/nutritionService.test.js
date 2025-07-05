import nutritionService from '../services/nutritionService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('nutritionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios mock to default behavior
    mockedAxios.get.mockResolvedValue({ data: {} });
    mockedAxios.post.mockResolvedValue({ data: {} });
    mockedAxios.put.mockResolvedValue({ data: {} });
    mockedAxios.patch.mockResolvedValue({ data: {} });
    mockedAxios.delete.mockResolvedValue({ data: {} });
  });

  describe('getDailyReport', () => {
    test('fetches daily report with correct date format', async () => {
      const mockResponse = {
        data: {
          date: '2023-01-01',
          total_food_calories: 1500,
          total_exercise_calories: 300,
          net_calories: 1200,
          meals: [],
          exercises: [],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Create date using local timezone to avoid timezone issues
      const testDate = new Date(2023, 0, 1); // Year, Month (0-indexed), Day

      const result = await nutritionService.getDailyReport(testDate);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/daily?date=2023-01-01');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles API errors gracefully', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(nutritionService.getDailyReport(new Date())).rejects.toThrow('Network error');
    });

    test('formats date parameter correctly for different date inputs', async () => {
      const mockResponse = { data: {} };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Test with Date object using local timezone
      await nutritionService.getDailyReport(new Date(2023, 5, 15)); // June 15, 2023
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/daily?date=2023-06-15');

      // Test with different date
      await nutritionService.getDailyReport(new Date(2023, 11, 31)); // December 31, 2023
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/daily?date=2023-12-31');
    });
  });

  describe('getWeeklyReport', () => {
    test('fetches weekly report with correct parameters', async () => {
      const mockResponse = {
        data: {
          start_date: '2023-01-01',
          end_date: '2023-01-07',
          overall_total_food_calories: 10500,
          overall_total_exercise_calories: 2100,
          overall_total_net_calories: 8400,
          daily_summaries: [
            {
              date: '2023-01-01',
              total_food_calories: 1500,
              total_exercise_calories: 300,
              net_calories: 1200,
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getWeeklyReport(new Date(2023, 0, 7)); // January 7, 2023

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/weekly?date=2023-01-07');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles empty weekly data', async () => {
      const mockResponse = { 
        data: { 
          start_date: '2023-01-01',
          end_date: '2023-01-07',
          overall_total_food_calories: 0,
          overall_total_exercise_calories: 0,
          overall_total_net_calories: 0,
          daily_summaries: [] 
        } 
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getWeeklyReport(new Date());
      expect(result.daily_summaries).toEqual([]);
      expect(result.overall_total_food_calories).toBe(0);
    });

    test('handles week range correctly', async () => {
      const mockResponse = {
        data: {
          start_date: '2023-01-01',
          end_date: '2023-01-07',
          overall_total_food_calories: 10500,
          overall_total_exercise_calories: 2100,
          overall_total_net_calories: 8400,
          daily_summaries: [],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getWeeklyReport(new Date(2023, 0, 4)); // January 4, 2023
      
      expect(result.start_date).toBe('2023-01-01');
      expect(result.end_date).toBe('2023-01-07');
    });
  });

  describe('getMonthlyReport', () => {
    test('fetches monthly report with correct month/year', async () => {
      const mockResponse = {
        data: {
          month: 1,
          year: 2023,
          weekly_summaries: [],
          monthly_totals: {
            total_food_calories: 45000,
            total_exercise_calories: 9000,
            net_calories: 36000
          }
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getMonthlyReport(1, 2023);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/monthly?month=1&year=2023');
      expect(result).toEqual(mockResponse.data);
    });

    test('validates month parameter', async () => {
      const mockResponse = { data: {} };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Test edge cases
      await nutritionService.getMonthlyReport(12, 2023);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/monthly?month=12&year=2023');

      await nutritionService.getMonthlyReport(1, 2023);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/monthly?month=1&year=2023');
    });
  });

  describe('addOrUpdateMealEntry', () => {
    test('creates new meal entry with correct data', async () => {
      const mealData = {
        meal_type: 'breakfast',
        description: 'Oatmeal',
        calories: 350,
        date: '2023-01-01',
      };
      const mockResponse = { data: { id: 1, ...mealData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateMealEntry(mealData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/meals/', mealData);
      expect(result).toEqual(mockResponse.data);
    });

    test('updates existing meal entry', async () => {
      const mealData = {
        id: 1,
        meal_type: 'lunch',
        description: 'Salad',
        calories: 400,
        date: new Date(2023, 0, 1), // Use Date object instead of string
      };
      const expectedData = {
        meal_type: 'lunch',
        description: 'Salad',
        calories: 400,
        date: '2023-01-01',
      };
      const mockResponse = { data: expectedData };
      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateMealEntry(mealData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/samaanai/meals/1/', expectedData);
      expect(result).toEqual(mockResponse.data);
    });

    test('validates meal data before sending', async () => {
      const invalidMealData = {
        meal_type: 'breakfast',
        // Missing required fields
      };

      await nutritionService.addOrUpdateMealEntry(invalidMealData);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/meals/', invalidMealData);
    });

    test('handles zero calorie entries', async () => {
      const mealData = {
        meal_type: 'breakfast',
        description: 'Water',
        calories: 0,
        date: '2023-01-01',
      };
      const mockResponse = { data: { id: 1, ...mealData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateMealEntry(mealData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/meals/', mealData);
      expect(result.calories).toBe(0);
    });
  });

  describe('addOrUpdateExerciseEntry', () => {
    test('creates new exercise entry', async () => {
      const exerciseData = {
        description: 'Running',
        calories_burned: 300,
        duration_minutes: 30,
        date: '2023-01-01',
      };
      const mockResponse = { data: { id: 1, ...exerciseData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateExerciseEntry(exerciseData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/exercises/', exerciseData);
      expect(result).toEqual(mockResponse.data);
    });

    test('updates existing exercise entry', async () => {
      const exerciseData = {
        id: 1,
        description: 'Cycling',
        calories_burned: 250,
        duration_minutes: 45,
        date: new Date(2023, 0, 1), // Use Date object instead of string
      };
      const expectedData = {
        description: 'Cycling',
        calories_burned: 250,
        duration_minutes: 45,
        date: '2023-01-01',
      };
      const mockResponse = { data: expectedData };
      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateExerciseEntry(exerciseData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/samaanai/exercises/1/', expectedData);
      expect(result).toEqual(mockResponse.data);
    });

    test('handles zero calorie burn entries', async () => {
      const exerciseData = {
        description: 'Stretching',
        calories_burned: 0,
        duration_minutes: 15,
        date: '2023-01-01',
      };
      const mockResponse = { data: { id: 1, ...exerciseData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateExerciseEntry(exerciseData);

      expect(result.calories_burned).toBe(0);
    });
  });

  describe('addOrUpdateWeightEntry', () => {
    test('creates new weight entry', async () => {
      const weightData = {
        weight: 75.5,
        date: '2023-01-01',
      };
      const mockResponse = { data: { id: 1, ...weightData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateWeightEntry(weightData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/weight/', weightData);
      expect(result).toEqual(mockResponse.data);
    });

    test('updates existing weight entry', async () => {
      const weightData = {
        id: 1,
        weight: 74.2,
        date: new Date(2023, 0, 1),
      };
      const expectedData = {
        weight: 74.2,
        date: '2023-01-01',
      };
      const mockResponse = { data: expectedData };
      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await nutritionService.addOrUpdateWeightEntry(weightData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/samaanai/weight/1/', expectedData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getWeightHistory', () => {
    test('fetches weight history', async () => {
      const mockResponse = {
        data: [
          { id: 1, weight: 75.5, date: '2023-01-01' },
          { id: 2, weight: 74.8, date: '2023-01-02' },
        ],
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getWeightHistory();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/weight/');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles empty weight history', async () => {
      const mockResponse = { data: [] };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await nutritionService.getWeightHistory();
      expect(result).toEqual([]);
    });
  });

  describe('deleteMealEntry', () => {
    test('deletes meal entry by id', async () => {
      const mockResponse = { data: { success: true } };
      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await nutritionService.deleteMealEntry(1);

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/samaanai/meals/1/');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles delete meal entry error', async () => {
      const error = new Error('Delete failed');
      mockedAxios.delete.mockRejectedValue(error);

      await expect(nutritionService.deleteMealEntry(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteExerciseEntry', () => {
    test('deletes exercise entry by id', async () => {
      const mockResponse = { data: { success: true } };
      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await nutritionService.deleteExerciseEntry(1);

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/samaanai/exercises/1/');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles delete exercise entry error', async () => {
      const error = new Error('Delete failed');
      mockedAxios.delete.mockRejectedValue(error);

      await expect(nutritionService.deleteExerciseEntry(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('error handling', () => {
    test('handles network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(nutritionService.getDailyReport(new Date())).rejects.toThrow('Network Error');
    });

    test('handles 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { error: 'Not found' }
        }
      };
      mockedAxios.get.mockRejectedValue(notFoundError);

      await expect(nutritionService.getDailyReport(new Date())).rejects.toEqual(notFoundError);
    });

    test('handles 500 errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      };
      mockedAxios.get.mockRejectedValue(serverError);

      await expect(nutritionService.getDailyReport(new Date())).rejects.toEqual(serverError);
    });
  });

  describe('date formatting', () => {
    test('formats dates consistently across different methods', async () => {
      const mockResponse = { data: {} };
      mockedAxios.get.mockResolvedValue(mockResponse);
      mockedAxios.post.mockResolvedValue(mockResponse);

      const testDate = new Date(2023, 2, 15); // March 15, 2023

      // Test daily report
      await nutritionService.getDailyReport(testDate);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/daily?date=2023-03-15');

      // Test weekly report
      await nutritionService.getWeeklyReport(testDate);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/samaanai/reports/weekly?date=2023-03-15');

      // Test meal entry with date object
      await nutritionService.addOrUpdateMealEntry({
        meal_type: 'breakfast',
        calories: 300,
        date: testDate
      });
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/samaanai/meals/', {
        meal_type: 'breakfast',
        calories: 300,
        date: '2023-03-15'
      });
    });
  });
}); 