import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { format, addDays, subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import nutritionService from '../services/nutritionService';
import { useAuth } from '../contexts/AuthContext';

import {
  Card,
  Button,
  Flex,
  Title,
  Text,
  FormGroup,
  Label,
  Input,
  Spinner,
  Grid,
} from 'common/components/UI';

const DailyEntry = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyReportData, setDailyReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formValues, setFormValues] = useState({
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    exercise: ''
  });
  
  const fetchDailyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Debug date timezone issues
      console.log("Date debugging:");
      console.log("- selectedDate:", selectedDate);
      console.log("- Local ISO string:", selectedDate.toISOString());
      console.log("- Date components:", {
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1, // 0-indexed
        day: selectedDate.getDate(),
        hours: selectedDate.getHours(),
        minutes: selectedDate.getMinutes()
      });
      console.log("- UTC components:", {
        year: selectedDate.getUTCFullYear(),
        month: selectedDate.getUTCMonth() + 1, // 0-indexed
        day: selectedDate.getUTCDate(),
        hours: selectedDate.getUTCHours(),
        minutes: selectedDate.getUTCMinutes()
      });
      console.log("- Timezone offset in minutes:", selectedDate.getTimezoneOffset());
      
      const data = await nutritionService.getDailyReport(selectedDate);
      console.log("- API returned date:", data.date);
      
      setDailyReportData(data);

      const newFormValues = {
        breakfast: data.meals?.find(m => m.meal_type === 'breakfast')?.calories || '',
        lunch: data.meals?.find(m => m.meal_type === 'lunch')?.calories || '',
        dinner: data.meals?.find(m => m.meal_type === 'dinner')?.calories || '',
        snacks: data.meals?.find(m => m.meal_type === 'snacks')?.calories || '',
        exercise: data.exercises?.[0]?.calories_burned || ''
      };
      setFormValues(newFormValues);

    } catch (err) {
      console.error('Error fetching daily report:', err);
      setError('Failed to fetch daily data. Please try again later.');
      setDailyReportData(null);
      setFormValues({ breakfast: '', lunch: '', dinner: '', snacks: '', exercise: '' });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);
  
  useEffect(() => {
    fetchDailyReport();
  }, [fetchDailyReport]);
  
  const handlePreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };
  
  const handleNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };
  
  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    let success = true;

    try {
      const mealTypes = [
        { key: 'breakfast', description: 'Breakfast' },
        { key: 'lunch', description: 'Lunch' },
        { key: 'dinner', description: 'Dinner' },
        { key: 'snacks', description: 'Snacks' },
      ];

      for (const meal of mealTypes) {
        const existingEntry = dailyReportData?.meals?.find(m => m.meal_type === meal.key);
        const calories = formValues[meal.key];

        if (calories && calories !== '0' && calories !== '') {
          const mealData = {
            meal_type: meal.key,
            description: meal.description,
            calories: parseInt(calories, 10),
            date: selectedDate,
          };
          if (existingEntry) {
            mealData.id = existingEntry.id;
          }
          await nutritionService.addOrUpdateMealEntry(mealData);
        } else if (existingEntry) {
          await nutritionService.deleteMealEntry(existingEntry.id);
        }
      }

      const existingExercise = dailyReportData?.exercises?.[0];
      const exerciseCalories = formValues.exercise;
      if (exerciseCalories && exerciseCalories !== '0' && exerciseCalories !== '') {
        const exerciseData = {
          description: 'Daily Exercise',
          calories_burned: parseInt(exerciseCalories, 10),
          duration_minutes: 30, 
          date: selectedDate,
        };
        if (existingExercise) {
          exerciseData.id = existingExercise.id;
        }
        await nutritionService.addOrUpdateExerciseEntry(exerciseData);
      } else if (existingExercise) {
        await nutritionService.deleteExerciseEntry(existingExercise.id);
      }

    } catch (err) {
      console.error('Error submitting entries:', err);
      setError('Failed to save entries. Please check your inputs and try again.');
      success = false;
    } finally {
      setIsSubmitting(false);
      if (success) {
        fetchDailyReport();
      }
    }
  };
  
  const handleDeleteMealEntry = async (id) => {
    try {
      await nutritionService.deleteMealEntry(id);
      fetchDailyReport();
    } catch (err) {
      console.error('Error deleting meal entry:', err);
      setError('Failed to delete meal entry. Please try again.');
    }
  };
  
  const handleDeleteExerciseEntry = async (id) => {
    try {
      await nutritionService.deleteExerciseEntry(id);
      fetchDailyReport();
    } catch (err) {
      console.error('Error deleting exercise entry:', err);
      setError('Failed to delete exercise entry. Please try again.');
    }
  };
  
  const calculateNetCalories = () => {
    if (!dailyReportData || !currentUser?.profile?.metabolic_rate) return null;
    
    const { total_food_calories, total_exercise_calories } = dailyReportData;
    
    // Set net calories to 0 if no food or exercise logged
    const hasData = (total_food_calories > 0 || total_exercise_calories > 0);
    if (!hasData) return 0;
    
    const { metabolic_rate, weight_loss_goal } = currentUser.profile;
    const weightLossCaloriesPerDay = (weight_loss_goal * 3500) / 7;
    
    return Math.round(
      metabolic_rate - 
      weightLossCaloriesPerDay - 
      total_food_calories + 
      total_exercise_calories
    );
  };

  if (loading) {
    return (
      <LoadingWrapper>
        <Spinner size="32px" />
        <Text>Loading daily data...</Text>
      </LoadingWrapper>
    );
  }

  return (
    <div>
      <StickyHeader>
        <Flex justify="space-between" align="center">
          <Title>Daily Log</Title>
          <DateNavigation>
            <Button variant="outline" onClick={handlePreviousDay} aria-label="Previous day">
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            <DatePickerWrapper>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="MMMM d, yyyy"
                customInput={<DateDisplay />}
              />
            </DatePickerWrapper>
            <Button variant="outline" onClick={handleNextDay} aria-label="Next day">
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
          </DateNavigation>
        </Flex>
      </StickyHeader>
      
      {error && (
        <ErrorBanner>
          <Text color="white" noMargin>{error}</Text>
        </ErrorBanner>
      )}
      
      <SummaryCard>
        <Grid columns="repeat(3, 1fr)" mobileColumns="repeat(1, 1fr)" gap="lg">
          <CalorieBox title="Food" value={dailyReportData?.total_food_calories || 0} icon="restaurant" color="danger" />
          <CalorieBox title="Exercise" value={dailyReportData?.total_exercise_calories || 0} icon="fitness_center" color="primary" />
          <CalorieBox 
            title="Net Calories" 
            value={calculateNetCalories()} 
            icon="calculate" 
            color="secondary"
            tooltip="Metabolic Rate - Weight Loss Goal - Food + Exercise"
          />
        </Grid>
      </SummaryCard>
      
      <EntryFormCard>
        <Title size="1.25rem">Log Calories</Title>
        <Grid columns="repeat(2, 1fr)" tabletColumns="repeat(2, 1fr)" mobileColumns="1fr" gap="md">
          <FormGroup>
            <Label>Breakfast (cal)</Label>
            <Input type="number" value={formValues.breakfast} onChange={(e) => handleInputChange('breakfast', e.target.value)} placeholder="Calories" />
          </FormGroup>
          <FormGroup>
            <Label>Lunch (cal)</Label>
            <Input type="number" value={formValues.lunch} onChange={(e) => handleInputChange('lunch', e.target.value)} placeholder="Calories" />
          </FormGroup>
          <FormGroup>
            <Label>Dinner (cal)</Label>
            <Input type="number" value={formValues.dinner} onChange={(e) => handleInputChange('dinner', e.target.value)} placeholder="Calories" />
          </FormGroup>
          <FormGroup>
            <Label>Snacks (cal)</Label>
            <Input type="number" value={formValues.snacks} onChange={(e) => handleInputChange('snacks', e.target.value)} placeholder="Calories" />
          </FormGroup>
          <FormGroup>
            <Label>Exercise (cal burned)</Label>
            <Input type="number" value={formValues.exercise} onChange={(e) => handleInputChange('exercise', e.target.value)} placeholder="Calories Burned" />
          </FormGroup>
        </Grid>
        <Flex justify="flex-end" style={{ marginTop: '1rem' }}>
          <Button onClick={handleSubmit} disabled={isSubmitting || loading}>
            {isSubmitting ? 'Saving...' : 'Save All Entries'}
          </Button>
        </Flex>
      </EntryFormCard>
      
      <EntriesDisplayCard>
        <Title size="1.25rem">Logged Entries for {format(selectedDate, 'MMMM d')}</Title>
        <Grid columns="repeat(2, 1fr)" mobileColumns="1fr" gap="lg">
          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: '0.5rem'}}>
              <SectionTitle>Food ({dailyReportData?.total_food_calories || 0} cal)</SectionTitle>
            </Flex>
            <EntryList>
              {dailyReportData?.meals && dailyReportData.meals.length > 0 ? dailyReportData.meals.map(meal => (
                <EntryItem key={meal.id}>
                  <Flex justify="space-between" align="center">
                    <div>
                      <Badge>{meal.meal_type}</Badge>
                      <Text noMargin>{meal.description} ({meal.calories} cal)</Text>
                    </div>
                    <DeleteButton onClick={() => handleDeleteMealEntry(meal.id)} aria-label="Delete meal">
                      <span className="material-symbols-outlined">delete</span>
                    </DeleteButton>
                  </Flex>
                </EntryItem>
              )) : <EmptyMessage>No food logged yet.</EmptyMessage>}
            </EntryList>
          </div>
          
          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: '0.5rem'}}>
                <SectionTitle>Exercise ({dailyReportData?.total_exercise_calories || 0} cal)</SectionTitle>
            </Flex>
            <EntryList>
              {dailyReportData?.exercises && dailyReportData.exercises.length > 0 ? dailyReportData.exercises.map(ex => (
                <EntryItem key={ex.id}>
                  <Flex justify="space-between" align="center">
                    <div>
                      <Text noMargin>{ex.description} ({ex.calories_burned} cal)</Text>
                      {ex.duration_minutes && <Text small muted>{ex.duration_minutes} mins</Text>}
                    </div>
                    <DeleteButton onClick={() => handleDeleteExerciseEntry(ex.id)} aria-label="Delete exercise">
                      <span className="material-symbols-outlined">delete</span>
                    </DeleteButton>
                  </Flex>
                </EntryItem>
              )) : <EmptyMessage>No exercise logged yet.</EmptyMessage>}
            </EntryList>
          </div>
        </Grid>
      </EntriesDisplayCard>
    </div>
  );
};

const DateDisplay = React.forwardRef(({ value, onClick }, ref) => (
  <DateButton onClick={onClick} ref={ref}>{value}</DateButton>
));

const CalorieBox = ({ title, value, icon, color, tooltip }) => (
  <SummaryBox title={tooltip}>
    <SummaryBoxIcon color={color}><span className="material-symbols-outlined">{icon}</span></SummaryBoxIcon>
    <SummaryBoxContent>
      <SummaryBoxTitle>{title}</SummaryBoxTitle>
      <SummaryBoxValue color={color}>{value !== null ? value : '---'} cal</SummaryBoxValue>
    </SummaryBoxContent>
  </SummaryBox>
);

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: ${({ theme }) => theme.colors.light};
  padding-bottom: 1rem;
`;

const DateNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DatePickerWrapper = styled.div`
  .react-datepicker-wrapper {
    width: auto;
  }
  .react-datepicker {
    font-family: ${({ theme }) => theme.fonts.body};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .react-datepicker__header {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
  }
  .react-datepicker__current-month, .react-datepicker__day-name {
    color: white;
  }
  .react-datepicker__day--selected {
    background-color: ${({ theme }) => theme.colors.primary};
  }
`;

const DateButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.neutral}44;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1rem;
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  > div {
    margin-bottom: 1rem;
  }
`;

const SummaryCard = styled(Card)`
  margin-bottom: 1.5rem;
`;

const SummaryBox = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

const SummaryBoxIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  background-color: ${({ theme, color }) => theme.colors[color] + '15'};
  margin-right: 1rem;
  span {
    color: ${({ theme, color }) => theme.colors[color]};
    font-size: 24px;
  }
`;

const SummaryBoxContent = styled.div`
  flex: 1;
`;

const SummaryBoxTitle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-bottom: 0.25rem;
`;

const SummaryBoxValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
`;

const EntryFormCard = styled(Card)`
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
`;
const EntriesDisplayCard = styled(Card)``;

const EntryList = styled.div`
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
`;

const EntryItem = styled.div`
  padding: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: none;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  background: ${({ theme }) => theme.colors.lightGrey};
  border-radius: 4px;
  font-size: 0.8rem;
  margin-right: 8px;
  text-transform: capitalize;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.neutral};
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
  span {
    font-size: 20px;
  }
`;

const EmptyMessage = styled.div`
  padding: 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-style: italic;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.dark};
`;

export default DailyEntry;