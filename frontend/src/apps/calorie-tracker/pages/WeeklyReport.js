import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { format, getDay, subDays, addDays, parseISO } from 'date-fns';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title as ChartTitle, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import nutritionService from '../services/nutritionService';
import { useAuth } from '../../../common/auth';
import { 
  Card, 
  Button, 
  Flex, 
  Title, 
  Text, 
  Spinner, 
  Grid 
} from 'common/components/UI';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

// Helper function to parse date strings as local dates (not UTC)
const parseLocalDate = (dateString) => {
  // Parse YYYY-MM-DD as local date, not UTC
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
};

// Move getStartOfCurrentWeek outside the WeeklyReport component
const getStartOfCurrentWeek = (currentUser) => {
  const today = new Date();
  const jsDayOfWeek = getDay(today);
  const pythonWeekday = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
  let preferredStartDay = 2;
  if (currentUser && currentUser.profile && currentUser.profile.start_of_week !== undefined) {
    preferredStartDay = parseInt(currentUser.profile.start_of_week, 10);
  }
  const daysToSubtract = (pythonWeekday - preferredStartDay + 7) % 7;
  return subDays(today, daysToSubtract);
};

const WeeklyReport = () => {
  const { currentUser } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(() => getStartOfCurrentWeek(currentUser));
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Re-calculate start of week when user changes or when their profile is loaded
  useEffect(() => {
    setSelectedDate(getStartOfCurrentWeek(currentUser));
  }, [currentUser]);
  
  const fetchWeeklyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await nutritionService.getWeeklyReport(selectedDate);
      
      setWeeklyData(data);
    } catch (err) {
      console.error('Error fetching weekly data:', err);
      setError('Failed to fetch weekly report. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);
  
  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);
  
  const handlePreviousWeek = () => {
    // Go back exactly 7 days
    setSelectedDate(prevDate => subDays(prevDate, 7));
  };
  
  const handleNextWeek = () => {
    // Go forward exactly 7 days
    setSelectedDate(prevDate => addDays(prevDate, 7));
  };
  
  // Prepare data for the chart
  const prepareChartData = () => {
    if (!weeklyData || !weeklyData.daily_summaries) return null;
    
    const sortedEntries = [...weeklyData.daily_summaries].sort((a, b) => 
      parseLocalDate(a.date) - parseLocalDate(b.date)
    );
    
    const labels = sortedEntries.map(entry => format(parseLocalDate(entry.date), 'EEE, MMM d'));
    
    const foodData = sortedEntries.map(entry => entry.total_food_calories || 0);
    const exerciseData = sortedEntries.map(entry => entry.total_exercise_calories || 0);
    const netCaloriesData = sortedEntries.map(entry => {
      // Set net calories to 0 if no food or exercise logged
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return hasData ? (entry.net_calories || 0) : 0;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Food',
          data: foodData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'Exercise',
          data: exerciseData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Net',
          data: netCaloriesData,
          backgroundColor: 'rgba(33, 150, 243, 0.5)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1,
        }
      ]
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Calories'
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: {
          drawOnChartArea: false, 
        },
        title: {
          display: true,
          text: 'Net Calories'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + ' calories';
            }
            return label;
          }
        }
      }
    },
  };
  
  // Calculate which day should show as the start of the week
  const getPythonWeekday = (jsDate) => {
    // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
    // Python: Monday = 0, Tuesday = 1, ..., Sunday = 6
    const jsDay = jsDate.getDay();
    return jsDay === 0 ? 6 : jsDay - 1; // Convert Sunday (0) to 6, others subtract 1
  };

  // Get start day index for this week
  const startDayIndex = currentUser?.profile?.start_of_week || 2; // Default Wednesday
  const pythonDay = getPythonWeekday(selectedDate);
  
  return (
    <div>
      <StickyHeader>
        <Flex justify="space-between" align="center">
          <Title>Weekly Report</Title>
          
          <WeekNavigation>
            <Button 
              variant="outline" 
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            
            <WeekDisplay>
              {weeklyData && weeklyData.start_date && weeklyData.end_date ? (
                <>
                  <span>{format(parseLocalDate(weeklyData.start_date), 'MMM d')}</span>
                  <span> - </span>
                  <span>{format(parseLocalDate(weeklyData.end_date), 'MMM d, yyyy')}</span>
                  <WeekDisplayStartDay>
                    ({(() => {
                      // Get user's start day name
                      // Python's weekday values: 0=Monday, 1=Tuesday, 2=Wednesday, etc.
                      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      let startDayIndex = 2; // Default Wednesday
                      if (currentUser?.profile?.start_of_week !== undefined) {
                        startDayIndex = currentUser.profile.start_of_week;
                      }
                      
                      // Verify the start date weekday
                      const startDate = parseLocalDate(weeklyData.start_date);
                      const jsDay = getDay(startDate); // 0=Sunday, 1=Monday, ..., 6=Saturday
                      const pythonDay = jsDay === 0 ? 6 : jsDay - 1; // Convert JS day to Python day
                      
                      // Use the actual day from the API response for the display
                      return `${dayNames[startDayIndex]} start`;
                    })()})
                  </WeekDisplayStartDay>
                </>
              ) : (
                'Loading...'
              )}
            </WeekDisplay>
            
            <Button 
              variant="outline" 
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
          </WeekNavigation>
        </Flex>
      </StickyHeader>
      
      {error && (
        <ErrorBanner>
          <Text color="white" noMargin>{error}</Text>
        </ErrorBanner>
      )}
      
      {loading ? (
        <LoadingWrapper>
          <Spinner size="32px" />
          <Text>Loading weekly data...</Text>
        </LoadingWrapper>
      ) : (
        <>
          <SummaryCard>
            <WeeklySummary>
              <SummaryTitle>Weekly Calorie Balance</SummaryTitle>
              <Grid columns="repeat(3, 1fr)" mobileColumns="repeat(1, 1fr)" gap="lg">
                <SummaryBox>
                  <SummaryBoxIcon color="danger">
                    <span className="material-symbols-outlined">restaurant</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Total Food</SummaryBoxTitle>
                    <SummaryBoxValue>
                      {weeklyData?.daily_summaries?.reduce((sum, entry) => sum + (entry.total_food_calories || 0), 0) || 0} cal
                    </SummaryBoxValue>
                  </SummaryBoxContent>
                </SummaryBox>
                
                <SummaryBox>
                  <SummaryBoxIcon color="primary">
                    <span className="material-symbols-outlined">fitness_center</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Total Exercise</SummaryBoxTitle>
                    <SummaryBoxValue>
                       {weeklyData?.daily_summaries?.reduce((sum, entry) => sum + (entry.total_exercise_calories || 0), 0) || 0} cal
                    </SummaryBoxValue>
                  </SummaryBoxContent>
                </SummaryBox>
                
                <SummaryBox>
                  <SummaryBoxIcon color="secondary">
                    <span className="material-symbols-outlined">calculate</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Net Balance</SummaryBoxTitle>
                    <SummaryBoxValue color={ (weeklyData?.overall_total_net_calories || 0) >= 0 ? 'primary' : 'danger'}>
                      {(() => {
                        // Calculate overall net calories with our rule
                        if (!weeklyData || !weeklyData.daily_summaries) return 0;
                        
                        let total = 0;
                        weeklyData.daily_summaries.forEach(entry => {
                          const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
                          total += hasData ? (entry.net_calories || 0) : 0;
                        });
                        
                        return total;
                      })() || 0} cal
                    </SummaryBoxValue>
                    {!currentUser?.profile?.metabolic_rate && (
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
              </Grid>
            </WeeklySummary>
          </SummaryCard>

          <ChartCard>
            <ChartTitleWrapper>
              <Title size="1.25rem">Daily Breakdown</Title>
            </ChartTitleWrapper>
            {prepareChartData() ? (
              <ChartWrapper>
                <Bar data={prepareChartData()} options={chartOptions} />
              </ChartWrapper>
            ) : (
              <Text>No data available for chart.</Text>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

// Styled Components (ensure these are defined or imported)
const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  background-color: ${({ theme }) => theme.colors.light};
  padding: 1rem 0;
  margin-bottom: 1rem;
  z-index: 10;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const WeekNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WeekDisplay = styled.div`
  font-weight: 500;
  min-width: 180px; 
  text-align: center;
  font-size: 1rem;
`;

const WeekDisplayStartDay = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-top: 0.25rem;
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
  gap: 1rem;
`;

const SummaryCard = styled(Card)`
  margin-bottom: 1.5rem;
`;

const WeeklySummary = styled.div`
  padding: 1rem;
`;

const SummaryTitle = styled(Title)`
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
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
  border-radius: 50%;
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

const SummaryBoxContent = styled.div``;

const SummaryBoxTitle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-bottom: 0.25rem;
`;

const SummaryBoxValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }
`;

const ChartCard = styled(Card)`
  padding: 1.5rem;
`;

const ChartTitleWrapper = styled.div`
  margin-bottom: 1rem;
`;

const ChartWrapper = styled.div`
  height: 400px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    height: 300px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.xs}) {
    height: 250px;
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

export default WeeklyReport;