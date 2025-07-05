import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { addDays, subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import nutritionService from '../services/nutritionService';
import { useAuth } from '../../../common/auth';

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
      
      const data = await nutritionService.getDailyReport(selectedDate);
      
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
  
  const calculateNetCalories = () => {
    if (!dailyReportData) return null;
    
    const { total_food_calories, total_exercise_calories } = dailyReportData;
    
    // Set net calories to 0 if no food or exercise logged
    const hasData = (total_food_calories > 0 || total_exercise_calories > 0);
    if (!hasData) return 0;
    
    // Use default metabolic rate of 2000 if not set
    const metabolic_rate = currentUser?.profile?.metabolic_rate || 2000;
    const weight_loss_goal = currentUser?.profile?.weight_loss_goal || 0;
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
      
      {/* Show stats on desktop, hide on mobile initially */}
      <SummaryCard className="desktop-stats">
        <Grid columns="repeat(3, 1fr)" mobileColumns="repeat(1, 1fr)" gap="lg">
          <CalorieBox title="Food" value={dailyReportData?.total_food_calories || 0} icon="restaurant" color="primary" />
          <CalorieBox title="Exercise" value={dailyReportData?.total_exercise_calories || 0} icon="fitness_center" color="info" />
          <CalorieBox 
            title="Net Calories" 
            value={calculateNetCalories()} 
            icon="calculate" 
            color="secondary"
            tooltip="Metabolic Rate - Weight Loss Goal - Food + Exercise"
            showSetupLink={!currentUser?.profile?.metabolic_rate}
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
      
      {/* Show stats at bottom on mobile only */}
      <SummaryCard className="mobile-stats">
        <Title size="1rem">Today's Summary</Title>
        <MobileStatsGrid>
          <MobileStatItem>
            <span className="material-symbols-outlined">restaurant</span>
            <div>
              <div>Food</div>
              <div>{dailyReportData?.total_food_calories || 0} cal</div>
            </div>
          </MobileStatItem>
          <MobileStatItem>
            <span className="material-symbols-outlined">fitness_center</span>
            <div>
              <div>Exercise</div>
              <div>{dailyReportData?.total_exercise_calories || 0} cal</div>
            </div>
          </MobileStatItem>
          <MobileStatItem>
            <span className="material-symbols-outlined">calculate</span>
            <div>
              <div>Net Calories</div>
              <div>{calculateNetCalories() !== null ? calculateNetCalories() : '---'} cal</div>
              {!currentUser?.profile?.metabolic_rate && (
                <SetupLink>
                  <StyledLink to="/nutrition/profile">
                    <Text size="0.7rem" color="primary" noMargin>
                      Set up metabolic rate →
                    </Text>
                  </StyledLink>
                </SetupLink>
              )}
            </div>
          </MobileStatItem>
        </MobileStatsGrid>
      </SummaryCard>
    </div>
  );
};

const DateDisplay = React.forwardRef(({ value, onClick }, ref) => (
  <DateButton onClick={onClick} ref={ref}>{value}</DateButton>
));

const CalorieBox = ({ title, value, icon, color, tooltip, showSetupLink }) => (
  <SummaryBox title={tooltip}>
    <SummaryBoxIcon color={color}><span className="material-symbols-outlined">{icon}</span></SummaryBoxIcon>
    <SummaryBoxContent>
      <SummaryBoxTitle>{title}</SummaryBoxTitle>
      <SummaryBoxValue color={color}>{value !== null ? value : '---'} cal</SummaryBoxValue>
      {showSetupLink && (
        <SetupLink>
          <StyledLink to="/nutrition/profile">
            <Text size="0.75rem" color="primary" noMargin>
              Set up metabolic rate →
            </Text>
          </StyledLink>
        </SetupLink>
      )}
    </SummaryBoxContent>
  </SummaryBox>
);

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: ${({ theme }) => theme.colors.light};
  padding-bottom: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding-bottom: 0.75rem;
    
    /* Make the flex layout more compact */
    > div {
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    
    h1 {
      font-size: 1.5rem;
      text-align: center;
      margin-bottom: 0;
    }
  }
`;

const DateNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    gap: 0.25rem;
    flex-shrink: 0;
    min-width: 0;
    
    /* Keep all items on one line */
    > button {
      flex-shrink: 0;
      padding: 0.5rem;
      min-width: 40px;
      
      span {
        font-size: 20px;
      }
    }
  }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex: 1;
    min-width: 0;
    
    .react-datepicker-wrapper {
      width: 100%;
    }
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
  min-height: 44px;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    min-height: 40px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
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
  
  /* Desktop stats - show on desktop, hide on mobile */
  &.desktop-stats {
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      display: none;
    }
  }
  
  /* Mobile stats - hide on desktop, show on mobile */
  &.mobile-stats {
    display: none;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      display: block;
    }
  }
`;

const SummaryBox = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.small};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1.25rem;
    flex-direction: column;
    text-align: center;
    min-height: 140px;
    justify-content: center;
  }
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
  flex-shrink: 0;
  
  span {
    color: ${({ theme, color }) => theme.colors[color]};
    font-size: 24px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 56px;
    height: 56px;
    margin-right: 0;
    margin-bottom: 0.75rem;
    
    span {
      font-size: 28px;
    }
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
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: 1.75rem;
    margin-top: 0.25rem;
  }
`;

const SetupLink = styled.div`
  margin-top: 0.5rem;
  text-align: center;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const EntryFormCard = styled(Card)`
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
`;

const MobileStatsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MobileStatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
  
  span.material-symbols-outlined {
    font-size: 24px;
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
  
  > div:last-child {
    flex: 1;
    
    > div:first-child {
      font-size: 0.875rem;
      color: ${({ theme }) => theme.colors.neutral};
      margin-bottom: 0.25rem;
    }
    
    > div:nth-child(2) {
      font-size: 1.125rem;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.dark};
    }
  }
`;

export default DailyEntry;