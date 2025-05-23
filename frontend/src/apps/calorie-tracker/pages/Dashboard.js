import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { format } from 'date-fns';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  Title as ChartTitle, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

import nutritionService from '../services/nutritionService';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  Button,
  Title,
  Text,
  Spinner,
  Grid
} from 'common/components/UI';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayData, setTodayData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const today = new Date();
      
      // Fetch today's data using getDailyReport
      const dailyReportResult = await nutritionService.getDailyReport(today);
      setTodayData(dailyReportResult); // Contains meals, exercises, total_food_calories, total_exercise_calories, net_calories
      
      // Fetch weekly data
      const weeklyResult = await nutritionService.getWeeklyReport(today);
      setWeeklyData(weeklyResult); // Expects { daily_summaries: [...] }
      
      // Generate recent activity (combine recent meals and exercises from dailyReportResult)
      const meals = dailyReportResult?.meals || [];
      const exercises = dailyReportResult?.exercises || [];
      
      const combinedActivity = [
        ...meals.map(meal => ({
          type: 'meal',
          ...meal,
          timestamp: new Date(meal.created_at)
        })),
        ...exercises.map(exercise => ({
          type: 'exercise',
          ...exercise,
          timestamp: new Date(exercise.created_at)
        }))
      ];
      
      // Sort by most recent
      combinedActivity.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivity(combinedActivity.slice(0, 5)); // Show only 5 most recent
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate net calories - now using the value from the daily report
  const getTodayNetCalories = () => {
    if (!todayData) return 'N/A';
    
    // Set net calories to 0 if no food or exercise logged
    const hasData = (todayData.total_food_calories > 0 || todayData.total_exercise_calories > 0);
    if (!hasData) return 0;
    
    // net_calories is now directly available from the API response
    return todayData.net_calories !== null ? Math.round(todayData.net_calories) : 'N/A';
  };
  
  // Calculate caloric budget
  const calculateCaloricBudget = () => {
    if (!currentUser.profile || !currentUser.profile.metabolic_rate) return null;
    
    // Weight loss goal in calories per day (convert from lbs/week)
    const weightLossCalories = (currentUser.profile.weight_loss_goal * 3500) / 7;
    
    // Daily caloric budget
    return Math.round(currentUser.profile.metabolic_rate - weightLossCalories);
  };
  
  // Calculate daily goal progress
  const calculateGoalProgress = () => {
    if (!todayData || !currentUser.profile || !currentUser.profile.metabolic_rate) return 0;
    
    const budget = calculateCaloricBudget();
    if (!budget) return 0;
    
    // Use total_food_calories and total_exercise_calories directly from todayData
    const foodCalories = todayData.total_food_calories || 0;
    const exerciseCalories = todayData.total_exercise_calories || 0;

    // Calculate remaining calories
    const remaining = budget - foodCalories + exerciseCalories;
    
    // Calculate percentage of goal met (cap at 100%)
    const percentageUsed = Math.min(100, Math.max(0, (remaining / budget) * 100));
    return Math.round(percentageUsed);
  };
  
  // Prepare data for the weekly trend chart
  const prepareWeeklyTrendData = () => {
    // Updated to use weeklyData.daily_summaries
    if (!weeklyData || !weeklyData.daily_summaries || weeklyData.daily_summaries.length === 0) return null;
    
    // Sort the entries by date
    const sortedEntries = [...weeklyData.daily_summaries].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Format dates for labels
    const labels = sortedEntries.map(entry => format(new Date(entry.date), 'EEE'));
    
    // Data for chart
    const netCaloriesData = sortedEntries.map(entry => {
      // Set net calories to 0 if no food or exercise logged
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return hasData ? (entry.net_calories || 0) : 0;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Net Calories',
          data: netCaloriesData,
          borderColor: 'rgba(33, 150, 243, 1)',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };
  
  // Chart options
  const weeklyTrendOptions = {
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
          text: 'Net Calories'
        }
      }
    },
    plugins: {
      legend: {
        display: false
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
      <WelcomeBar>
        <div>
          <Title>Hello, {currentUser?.first_name || currentUser?.username}!</Title>
          <Text noMargin>Let's track your nutrition today</Text>
        </div>
        
        <StyledLink to="/daily">
          <Button>
            <span className="material-symbols-outlined">add_circle</span>
            Log Entry
          </Button>
        </StyledLink>
      </WelcomeBar>
      
      {error && (
        <ErrorBanner>
          <Text color="white" nomargin>{error}</Text>
        </ErrorBanner>
      )}
      
      {loading ? (
        <LoadingWrapper>
          <Spinner size="32px" />
          <Text>Loading dashboard data...</Text>
        </LoadingWrapper>
      ) : (
        <>
          {/* Today's Summary and Recent Activity */}
          <Grid columns="2fr 1fr" mobilecolumns="1fr" gap="lg">
            <Card>
              <TodaySummary>
                <SummaryHeader>
                  <div>
                    <Title size="1.25rem">Today's Summary</Title>
                    <Text nomargin>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
                  </div>
                  
                  <StyledLink to="/daily">
                    <Button variant="outline" size="small">
                      View Details
                    </Button>
                  </StyledLink>
                </SummaryHeader>
                
                <StatsGrid>
                  <StatBox>
                    <StatIcon color="primary">
                      <span className="material-symbols-outlined">local_fire_department</span>
                    </StatIcon>
                    <StatContent>
                      <StatLabel>Food</StatLabel>
                      <StatValue>{todayData?.total_food_calories || 0}</StatValue>
                      <StatUnit>cal</StatUnit>
                    </StatContent>
                  </StatBox>
                  
                  <StatBox>
                    <StatIcon color="secondary">
                      <span className="material-symbols-outlined">fitness_center</span>
                    </StatIcon>
                    <StatContent>
                      <StatLabel>Exercise</StatLabel>
                      <StatValue>{todayData?.total_exercise_calories || 0}</StatValue>
                      <StatUnit>cal</StatUnit>
                    </StatContent>
                  </StatBox>
                  
                  <StatBox>
                    <StatIcon color="warning">
                      <span className="material-symbols-outlined">balance</span>
                    </StatIcon>
                    <StatContent>
                      <StatLabel>Budget</StatLabel>
                      <StatValue>{calculateCaloricBudget() || 'N/A'}</StatValue>
                      <StatUnit>cal</StatUnit>
                    </StatContent>
                  </StatBox>
                  
                  <StatBox>
                    <StatIcon color="danger">
                      <span className="material-symbols-outlined">calculate</span>
                    </StatIcon>
                    <StatContent>
                      <StatLabel>Net</StatLabel>
                      <StatValue>{getTodayNetCalories()}</StatValue>
                      <StatUnit>cal</StatUnit>
                    </StatContent>
                  </StatBox>
                </StatsGrid>
                
                <GoalProgress>
                  <ProgressHeader>
                    <ProgressTitle>Daily Goal</ProgressTitle>
                    <ProgressValue>{calculateGoalProgress()}% Complete</ProgressValue>
                  </ProgressHeader>
                  <ProgressBar>
                    <ProgressFill width={`${calculateGoalProgress()}%`} />
                  </ProgressBar>
                </GoalProgress>
              </TodaySummary>
            </Card>
            
            <Card>
              <RecentActivityList>
                <Title size="1.25rem">Recent Activity</Title>
                
                {recentActivity.length > 0 ? (
                  <ActivityItems>
                    {recentActivity.map((activity, index) => (
                      <ActivityItem key={`${activity.type}-${activity.id || index}`}> {/* Add index for safety if id is missing */}
                        <ActivityIcon type={activity.type}>
                          <span className="material-symbols-outlined">
                            {activity.type === 'meal' ? 'restaurant' : 'fitness_center'}
                          </span>
                        </ActivityIcon>
                        <ActivityContent>
                          <ActivityTitle>{activity.description || (activity.type === 'meal' ? `${activity.meal_type} (${activity.calories} cal)` : `${activity.calories_burned} cal burned`)}</ActivityTitle>
                          <ActivityMeta>
                            {activity.type === 'meal' ? (
                              <>
                                <span>{activity.calories} calories</span>
                                <ActivityDot />
                                <span>{activity.meal_type}</span>
                              </>
                            ) : (
                              <>
                                <span>{activity.calories_burned} calories</span>
                                <ActivityDot />
                                <span>{activity.duration_minutes} minutes</span>
                              </>
                            )}
                          </ActivityMeta>
                        </ActivityContent>
                        <ActivityTime>
                          {/* Ensure timestamp is valid before formatting */} 
                          {activity.timestamp ? format(activity.timestamp, 'h:mm a') : ''}
                        </ActivityTime>
                      </ActivityItem>
                    ))}
                  </ActivityItems>
                ) : (
                  <EmptyActivity>
                    <span className="material-symbols-outlined">history</span>
                    <Text>No activity logged today</Text>
                    <Text>Start tracking your meals and exercises!</Text>
                  </EmptyActivity>
                )}
                
                <ViewAllLink to="/daily">
                  <span>View All Activity</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </ViewAllLink>
              </RecentActivityList>
            </Card>
          </Grid>
          
          {/* Weekly Trend */}
          <Card style={{ marginTop: '1.5rem' }}>
            <WeeklyTrend>
              <SummaryHeader>
                <div>
                  <Title size="1.25rem">Weekly Trends</Title>
                  <Text noMargin>Your net calorie intake for the past week</Text>
                </div>
                
                <StyledLink to="/weekly">
                  <Button variant="outline" size="small">
                    View Report
                  </Button>
                </StyledLink>
              </SummaryHeader>
              
              <ChartContainer height="300px">
                {prepareWeeklyTrendData() ? (
                  <Line data={prepareWeeklyTrendData()} options={weeklyTrendOptions} />
                ) : (
                  <EmptyState>
                    <span className="material-symbols-outlined">insert_chart</span>
                    <Text>No weekly data available yet.</Text>
                    <Text>Start logging your daily entries to see weekly trends.</Text>
                  </EmptyState>
                )}
              </ChartContainer>
            </WeeklyTrend>
          </Card>
          
          {/* Quick Actions */}
          <QuickActionsGrid>
            <ActionCard to="/daily">
              <ActionIcon className="material-symbols-outlined">add_circle</ActionIcon>
              <ActionTitle>Log Food</ActionTitle>
              <ActionDescription>Record your meals and snacks</ActionDescription>
            </ActionCard>
            
            <ActionCard to="/daily">
              <ActionIcon className="material-symbols-outlined">directions_run</ActionIcon>
              <ActionTitle>Log Exercise</ActionTitle>
              <ActionDescription>Track your workouts and activities</ActionDescription>
            </ActionCard>
            
            <ActionCard to="/weekly">
              <ActionIcon className="material-symbols-outlined">bar_chart</ActionIcon>
              <ActionTitle>Weekly Report</ActionTitle>
              <ActionDescription>View your progress this week</ActionDescription>
            </ActionCard>
            
            <ActionCard to="/profile">
              <ActionIcon className="material-symbols-outlined">settings</ActionIcon>
              <ActionTitle>Update Goals</ActionTitle>
              <ActionDescription>Adjust your nutrition targets</ActionDescription>
            </ActionCard>
          </QuickActionsGrid>
        </>
      )}
    </div>
  );
};

// Styled components
const WelcomeBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: flex-start;
    
    > div:first-child {
      margin-bottom: 1rem;
    }
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

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    
    button {
      margin-top: 1rem;
    }
  }
`;

const TodaySummary = styled.div`
  padding: 0.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatBox = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  background-color: ${({ theme, color }) => theme.colors[color] + '15'};
  margin-right: 1rem;
  
  span {
    color: ${({ theme, color }) => theme.colors[color]};
    font-size: 20px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-bottom: 0.25rem;
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.dark};
`;

const StatUnit = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-left: 0.25rem;
`;

const GoalProgress = styled.div`
  margin-top: 1rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const ProgressTitle = styled.div`
  font-weight: 500;
`;

const ProgressValue = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
`;

const ProgressBar = styled.div`
  height: 8px;
  background-color: ${({ theme }) => theme.colors.neutral}22;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ width }) => width || '0%'};
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  transition: width 0.3s ease;
`;

const WeeklyTrend = styled.div`
  padding: 0.5rem;
`;

const ChartContainer = styled.div`
  height: ${({ height }) => height || '300px'};
  position: relative;
`;

const RecentActivityList = styled.div`
  padding: 0.5rem;
`;

const ActivityItems = styled.div`
  margin-top: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral}22;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  background-color: ${({ theme, type }) => 
    type === 'meal' ? theme.colors.danger + '15' : theme.colors.primary + '15'};
  margin-right: 0.75rem;
  
  span {
    color: ${({ theme, type }) => 
      type === 'meal' ? theme.colors.danger : theme.colors.primary};
    font-size: 18px;
  }
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ActivityMeta = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
`;

const ActivityDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.neutral};
  margin: 0 0.5rem;
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-left: 0.75rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: ${({ theme }) => theme.colors.neutral};
  
  span {
    font-size: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  p {
    margin-bottom: 0.5rem;
    text-align: center;
  }
`;

const EmptyActivity = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
  color: ${({ theme }) => theme.colors.neutral};
  
  span {
    font-size: 32px;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }
  
  p {
    margin-bottom: 0.25rem;
    text-align: center;
    font-size: 0.9rem;
  }
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  padding: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  
  span.material-symbols-outlined {
    margin-left: 0.25rem;
    font-size: 18px;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
    border-radius: ${({ theme }) => theme.borderRadius.medium};
  }
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadows.medium};
  }
`;

const ActionIcon = styled.span`
  font-size: 2.5rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 1rem;
`;

const ActionTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.dark};
`;

const ActionDescription = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.neutral};
`;

const StyledLink = styled(Link)`
  text-decoration: none;
`;

export default Dashboard;