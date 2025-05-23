// Mock implementation of nutritionService
const nutritionService = {
  // Daily Report
  getDailyReport: jest.fn().mockResolvedValue({
    date: '2023-01-01',
    meals: [
      { id: 1, meal_type: 'breakfast', description: 'Breakfast', calories: 400 },
      { id: 2, meal_type: 'lunch', description: 'Lunch', calories: 600 },
      { id: 3, meal_type: 'dinner', description: 'Dinner', calories: 500 },
    ],
    exercises: [
      { id: 1, description: 'Daily Exercise', calories_burned: 300, duration_minutes: 30 }
    ],
    total_food_calories: 1500,
    total_exercise_calories: 300
  }),
  
  // Meal entries
  addOrUpdateMealEntry: jest.fn().mockImplementation((mealData) => {
    return Promise.resolve({
      id: mealData.id || Math.floor(Math.random() * 1000),
      ...mealData
    });
  }),
  
  deleteMealEntry: jest.fn().mockResolvedValue({}),
  
  // Exercise entries
  addOrUpdateExerciseEntry: jest.fn().mockImplementation((exerciseData) => {
    return Promise.resolve({
      id: exerciseData.id || Math.floor(Math.random() * 1000),
      ...exerciseData
    });
  }),
  
  deleteExerciseEntry: jest.fn().mockResolvedValue({}),

  // Weekly Report
  getWeeklyReport: jest.fn().mockResolvedValue({
    start_date: '2023-01-01',
    end_date: '2023-01-07',
    total_food_calories: 12000,
    total_exercise_calories: 4400,
    net_calories: 7600,
    daily_entries: [
      { date: '2023-01-01', food_calories: 1800, exercise_calories: 600, net_calories: 1200 },
      { date: '2023-01-02', food_calories: 1700, exercise_calories: 500, net_calories: 1200 },
      { date: '2023-01-03', food_calories: 1600, exercise_calories: 700, net_calories: 900 },
      { date: '2023-01-04', food_calories: 1800, exercise_calories: 800, net_calories: 1000 },
      { date: '2023-01-05', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
      { date: '2023-01-06', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
      { date: '2023-01-07', food_calories: 1700, exercise_calories: 600, net_calories: 1100 },
    ]
  }),
};

export default nutritionService;
