import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { format, getYear, getMonth } from 'date-fns';
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
import { 
  Card, 
  Button, 
  Flex, 
  Title, 
  Text, 
  Spinner,
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

const MonthlyReport = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const year = getYear(currentMonth);
      const month = getMonth(currentMonth) + 1; // date-fns months are 0-indexed
      const data = await nutritionService.getMonthlyReport(month, year);
      setMonthlyData(data);
    } catch (err) {
      console.error('Error fetching monthly data:', err);
      setError('Failed to fetch monthly report. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);
  
  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);
  
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)));
  };
  
  // Prepare data for the daily chart
  const prepareDailyChartData = () => {
    if (!monthlyData || !monthlyData.daily_entries || monthlyData.daily_entries.length === 0) {
      return null;
    }
    
    // Sort entries by date
    const sortedEntries = [...(monthlyData?.daily_entries || [])].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Format dates for labels
    const labels = sortedEntries.map(entry => format(new Date(entry.date), 'd'));
    
    // Data for chart
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
          type: 'line',
          label: 'Net Calories',
          data: netCaloriesData,
          borderColor: 'rgba(33, 150, 243, 1)',
          backgroundColor: 'rgba(33, 150, 243, 0.5)',
          borderWidth: 2,
          tension: 0.1,
          fill: false,
          yAxisID: 'y1',
        },
        {
          type: 'bar',
          label: 'Food Calories',
          data: foodData,
          backgroundColor: 'rgba(244, 67, 54, 0.7)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Exercise Calories',
          data: exerciseData,
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        }
      ]
    };
  };
  
  // Chart options
  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Day of Month'
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
          drawOnChartArea: false, // only show grid for left axis
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
  
  return (
    <div>
      <StickyHeader>
        <Flex justify="space-between" align="center">
          <Title>Monthly Report</Title>
          
          <MonthNavigation>
            <Button 
              variant="outline" 
              onClick={handlePreviousMonth}
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            
            <MonthDisplay>
              {format(currentMonth, 'MMMM yyyy')}
            </MonthDisplay>
            
            <Button 
              variant="outline" 
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
          </MonthNavigation>
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
          <Text>Loading monthly data...</Text>
        </LoadingWrapper>
      ) : (
        <>
          {/* Summary Card */}
          <SummaryCard>
            <MonthlySummary>
              <SummaryTitle>Monthly Calorie Summary</SummaryTitle>
              <SummaryGrid>
                <SummaryBox>
                  <SummaryBoxIcon color="danger">
                    <span className="material-symbols-outlined">restaurant</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Total Food</SummaryBoxTitle>
                    <SummaryBoxValue>
                      {monthlyData?.daily_entries?.reduce((sum, entry) => sum + (entry.total_food_calories || 0), 0) || 0} cal
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
                      {monthlyData?.daily_entries?.reduce((sum, entry) => sum + (entry.total_exercise_calories || 0), 0) || 0} cal
                    </SummaryBoxValue>
                  </SummaryBoxContent>
                </SummaryBox>
                
                <SummaryBox>
                  <SummaryBoxIcon color="secondary">
                    <span className="material-symbols-outlined">calculate</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Net Balance</SummaryBoxTitle>
                    <SummaryBoxValue color={ (monthlyData?.total_net_calories || 0) < 0 ? 'primary' : 'danger'}>
                      {(() => {
                        // Calculate overall net calories with our rule
                        if (!monthlyData || !monthlyData.daily_entries) return 0;
                        
                        let total = 0;
                        monthlyData.daily_entries.forEach(entry => {
                          const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
                          total += hasData ? (entry.net_calories || 0) : 0;
                        });
                        
                        return total;
                      })() || 0} cal
                    </SummaryBoxValue>
                  </SummaryBoxContent>
                </SummaryBox>
                
                <SummaryBox>
                  <SummaryBoxIcon color="warning">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </SummaryBoxIcon>
                  <SummaryBoxContent>
                    <SummaryBoxTitle>Logged Days</SummaryBoxTitle>
                    <SummaryBoxValue>
                      {monthlyData?.daily_entries?.length || 0} days
                    </SummaryBoxValue>
                  </SummaryBoxContent>
                </SummaryBox>
              </SummaryGrid>
            </MonthlySummary>
          </SummaryCard>
          
          {/* Chart Card */}
          <Card>
            <ChartHeader>
              <Flex justify="space-between" align="center">
                <div>
                  <Title size="1.25rem">Monthly Calorie Trends</Title>
                  <Text>
                    {monthNames[getMonth(currentMonth)]} {getYear(currentMonth)}
                  </Text>
                </div>
              </Flex>
            </ChartHeader>
            
            <ChartContainer>
              {prepareDailyChartData() ? (
                <Bar data={prepareDailyChartData()} options={dailyChartOptions} />
              ) : (
                <EmptyState>
                  <span className="material-symbols-outlined">insert_chart</span>
                  <Text>No daily data available for this month.</Text>
                </EmptyState>
              )}
            </ChartContainer>
          </Card>
          
          {/* Calendar View Card */}
          <Card>
            <Title size="1.25rem">Calorie Calendar</Title>
            
            {monthlyData && monthlyData.daily_entries && monthlyData.daily_entries.length > 0 ? (
              <CalendarGrid>
                {Array.from({ length: new Date(getYear(currentMonth), getMonth(currentMonth), 0).getDate() }, (_, i) => i + 1).map(day => {
                  const entry = monthlyData.daily_entries?.find(
                    e => new Date(e.date).getDate() === day
                  );
                  
                  return (
                    <CalendarDay key={day} hasData={!!entry}>
                      <DayNumber>{day}</DayNumber>
                      {entry ? (
                        <DayContent>
                          <DayStat>
                            <span className="material-symbols-outlined">restaurant</span>
                            {entry.total_food_calories || 0}
                          </DayStat>
                          <DayStat>
                            <span className="material-symbols-outlined">fitness_center</span>
                            {entry.total_exercise_calories || 0}
                          </DayStat>
                          <DayStat color={entry.net_calories < 0 ? 'danger' : 'primary'}>
                            <span className="material-symbols-outlined">calculate</span>
                            {entry.net_calories || 0}
                          </DayStat>
                        </DayContent>
                      ) : (
                        <EmptyDayContent>No data</EmptyDayContent>
                      )}
                    </CalendarDay>
                  );
                })}
              </CalendarGrid>
            ) : (
              <EmptyState>
                <span className="material-symbols-outlined">calendar_month</span>
                <Text>No data available for this month.</Text>
                <Text>Start logging your food and exercise to see your monthly calendar!</Text>
              </EmptyState>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

// Styled components
const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: ${({ theme }) => theme.colors.light};
  padding-bottom: 1rem;
`;

const MonthNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MonthDisplay = styled.div`
  font-weight: 500;
  text-align: center;
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

const MonthlySummary = styled.div`
  padding: 0.5rem;
`;

const SummaryTitle = styled.h3`
  margin-bottom: 1.5rem;
  font-size: 1.125rem;
  font-weight: 500;
  text-align: center;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
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
  color: ${({ theme }) => theme.colors.dark};
`;

const ChartHeader = styled.div`
  margin-bottom: 1.5rem;
  
  h2 {
    margin-bottom: 0.25rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.neutral};
    margin-bottom: 0;
  }
`;

const ChartContainer = styled.div`
  height: 400px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.small};
  margin-bottom: 1rem;
  
  span {
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.neutral};
    margin-bottom: 1rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.neutral};
    text-align: center;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
`;

const CalendarDay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme, hasData }) => hasData ? theme.colors.white : theme.colors.light};
  box-shadow: ${({ theme }) => theme.shadows.small};
  width: 100%;
  height: 100%;
`;

const DayNumber = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.dark};
`;

const DayContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const DayStat = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.dark};
`;

const EmptyDayContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${({ theme }) => theme.colors.neutral};
`;

export default MonthlyReport;