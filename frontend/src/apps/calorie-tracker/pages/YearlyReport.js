import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title as ChartTitle, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

import nutritionService from '../services/nutritionService';
import { 
  Card, 
  Button, 
  Flex, 
  Title, 
  Text, 
  Spinner, 
  Select,
} from 'common/components/UI';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ChartTitle,
  Tooltip,
  Legend
);

const YearlyReport = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Generate array of years (current year - 5 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const fetchYearlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await nutritionService.getYearlyReport(selectedYear);
      setYearlyData(data);
    } catch (err) {
      console.error('Error fetching yearly data:', err);
      setError('Failed to fetch yearly report. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);
  
  useEffect(() => {
    fetchYearlyData();
  }, [fetchYearlyData]);
  
  const handlePreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };
  
  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };
  
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };
  
  // Prepare data for the yearly chart
  const prepareYearlyChartData = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return null;
    }
    
    // Create an array of 12 months, with values from monthly_entries where available
    const monthlyData = Array(12).fill(0);
    yearlyData.monthly_entries.forEach(entry => {
      // Months are 1-indexed in the API but 0-indexed in our arrays
      const monthIndex = entry.month - 1;
      // Check if there's data for the month
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      
      // If there's data, adjust net calories based on the number of days with data
      if (hasData && entry.days_with_data > 0 && entry.days_in_month > 0) {
        // Calculate adjusted net calories (only counting days that had data)
        const adjustedNetCalories = entry.days_with_data > 0 
          ? (entry.net_calories || 0) * (entry.days_with_data / entry.days_in_month)
          : 0;
        
        monthlyData[monthIndex] = Math.round(adjustedNetCalories);
      } else {
        monthlyData[monthIndex] = 0;
      }
    });
    
    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Monthly Net Calories',
          data: monthlyData,
          backgroundColor: monthlyData.map(value => 
            value < 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'
          ),
          borderColor: monthlyData.map(value => 
            value < 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
          ),
          borderWidth: 1,
        }
      ]
    };
  };
  
  // Prepare data for the weight tracking chart
  const prepareWeightChartData = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return null;
    }
    
    // Filter only months that have weight data
    const monthsWithWeight = yearlyData.monthly_entries.filter(entry => entry.average_weight !== null);
    
    if (monthsWithWeight.length === 0) {
      return null;
    }
    
    // Sort by month to ensure chronological order
    monthsWithWeight.sort((a, b) => a.month - b.month);
    
    return {
      labels: monthsWithWeight.map(entry => monthNames[entry.month - 1]),
      datasets: [
        {
          label: 'Average Weight (lbs)',
          data: monthsWithWeight.map(entry => entry.average_weight),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          fill: true
        }
      ]
    };
  };
  
  // Prepare data for food calories chart
  const prepareFoodCaloriesChartData = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return null;
    }
    
    // Create an array of 12 months, with values from monthly_entries where available
    const monthlyData = Array(12).fill(0);
    yearlyData.monthly_entries.forEach(entry => {
      // Months are 1-indexed in the API but 0-indexed in our arrays
      const monthIndex = entry.month - 1;
      
      // Adjust food calories based on days with data
      if (entry.days_with_data > 0 && entry.days_in_month > 0) {
        const adjustedFoodCalories = (entry.total_food_calories || 0) * (entry.days_with_data / entry.days_in_month);
        monthlyData[monthIndex] = Math.round(adjustedFoodCalories);
      } else {
        monthlyData[monthIndex] = 0;
      }
    });
    
    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Food Calories',
          data: monthlyData,
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        }
      ]
    };
  };
  
  // Prepare data for exercise calories chart
  const prepareExerciseCaloriesChartData = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return null;
    }
    
    // Create an array of 12 months, with values from monthly_entries where available
    const monthlyData = Array(12).fill(0);
    yearlyData.monthly_entries.forEach(entry => {
      // Months are 1-indexed in the API but 0-indexed in our arrays
      const monthIndex = entry.month - 1;
      
      // Adjust exercise calories based on days with data
      if (entry.days_with_data > 0 && entry.days_in_month > 0) {
        const adjustedExerciseCalories = (entry.total_exercise_calories || 0) * (entry.days_with_data / entry.days_in_month);
        monthlyData[monthIndex] = Math.round(adjustedExerciseCalories);
      } else {
        monthlyData[monthIndex] = 0;
      }
    });
    
    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Exercise Calories',
          data: monthlyData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        }
      ]
    };
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
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
        display: true,
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
          },
          footer: function(tooltipItems) {
            const value = tooltipItems[0].parsed.y;
            let message = '';
            
            if (value < -3500) {
              const lbs = Math.abs(value) / 3500;
              message = `Estimated Weight Loss: ${lbs.toFixed(1)} lbs`;
            } else if (value > 3500) {
              const lbs = value / 3500;
              message = `Estimated Weight Gain: ${lbs.toFixed(1)} lbs`;
            }
            
            return message ? [message] : [];
          }
        }
      }
    },
  };
  
  // Chart options for weight chart
  const weightChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Weight (lbs)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
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
              label += context.parsed.y + ' lbs';
            }
            return label;
          }
        }
      }
    },
  };
  
  // Calculate yearly stats
  const calculateYearlyStats = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return {
        totalNetCalories: 0,
        monthsTracked: 0,
        averageMonthlyCalories: 0,
        estimatedWeightChange: 0,
        currentWeight: null
      };
    }
    
    const monthsTracked = yearlyData.monthly_entries.length;
    
    // Recalculate total net calories after applying our rule
    let totalNetCalories = 0;
    yearlyData.monthly_entries.forEach(entry => {
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      if (hasData && entry.days_with_data > 0 && entry.days_in_month > 0) {
        // Calculate adjusted net calories (only counting days that had data)
        const adjustedNetCalories = entry.days_with_data > 0 
          ? (entry.net_calories || 0) * (entry.days_with_data / entry.days_in_month)
          : 0;
        
        totalNetCalories += Math.round(adjustedNetCalories);
      }
    });
    
    const averageMonthlyCalories = monthsTracked > 0 
      ? Math.round(totalNetCalories / monthsTracked) 
      : 0;
    const estimatedWeightChange = totalNetCalories / 3500; // 3500 calories = 1 lb
    
    // Get the most recent weight from entries
    let currentWeight = null;
    if (yearlyData.monthly_entries.length > 0) {
      // Sort entries by month descending to get the most recent one with weight data
      const entriesWithWeight = [...yearlyData.monthly_entries]
        .filter(entry => entry.average_weight !== null)
        .sort((a, b) => b.month - a.month);
      
      if (entriesWithWeight.length > 0) {
        currentWeight = entriesWithWeight[0].average_weight;
      }
    }
    
    return {
      totalNetCalories,
      monthsTracked,
      averageMonthlyCalories,
      estimatedWeightChange,
      currentWeight
    };
  };
  
  const yearlyStats = calculateYearlyStats();
  
  // Calculate adjusted yearly food calories
  const calculateAdjustedYearlyFoodCalories = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return 0;
    }
    
    let totalFoodCalories = 0;
    yearlyData.monthly_entries.forEach(entry => {
      if (entry.total_food_calories > 0) {
        totalFoodCalories += entry.total_food_calories;
      }
    });
    
    return totalFoodCalories;
  };
  
  // Calculate adjusted yearly exercise calories
  const calculateAdjustedYearlyExerciseCalories = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return 0;
    }
    
    let totalExerciseCalories = 0;
    yearlyData.monthly_entries.forEach(entry => {
      if (entry.total_exercise_calories > 0) {
        totalExerciseCalories += entry.total_exercise_calories;
      }
    });
    
    return totalExerciseCalories;
  };
  
  // Calculate total days with data in the year
  const calculateTotalDaysTracked = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return 0;
    }
    
    let totalDaysTracked = 0;
    yearlyData.monthly_entries.forEach(entry => {
      if (entry.days_with_data > 0) {
        totalDaysTracked += entry.days_with_data;
      }
    });
    
    return totalDaysTracked;
  };
  
  return (
    <div>
      <StickyHeader>
        <Flex justify="space-between" align="center">
          <Title>Yearly Report</Title>
          
          <YearNavigation>
            <Button 
              variant="outline" 
              onClick={handlePreviousYear}
              aria-label="Previous year"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            
            <YearSelector>
              <Select value={selectedYear} onChange={handleYearChange}>
                {yearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </YearSelector>
            
            <Button 
              variant="outline" 
              onClick={handleNextYear}
              aria-label="Next year"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
          </YearNavigation>
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
          <Text>Loading yearly data...</Text>
        </LoadingWrapper>
      ) : (
        <>
          {/* Summary Card */}
          <SummaryCard>
            <YearlySummary>
              <SummaryTitle>Yearly Nutrition Summary - {selectedYear}</SummaryTitle>
              <StatsGrid>
                <StatBox highlight={yearlyStats.totalNetCalories !== 0}>
                  <StatTitle>Total Net Calories</StatTitle>
                  <StatValue 
                    color={yearlyStats.totalNetCalories < 0 ? 'primary' : 'danger'}
                  >
                    {yearlyStats.totalNetCalories.toLocaleString()} cal
                  </StatValue>
                </StatBox>
                
                {/* New Total Food Calories Card */}
                <StatBox highlight={yearlyData && yearlyData.yearly_total_food_calories > 0}>
                  <StatTitle>Total Food Calories</StatTitle>
                  <StatValue color="warning">
                    {yearlyData ? calculateAdjustedYearlyFoodCalories().toLocaleString() : 0} cal
                  </StatValue>
                </StatBox>
                
                {/* New Total Exercise Calories Card */}
                <StatBox highlight={yearlyData && yearlyData.yearly_total_exercise_calories > 0}>
                  <StatTitle>Total Exercise Calories</StatTitle>
                  <StatValue color="info">
                    {yearlyData ? calculateAdjustedYearlyExerciseCalories().toLocaleString() : 0} cal
                  </StatValue>
                </StatBox>
                
                <StatBox highlight={yearlyStats.monthsTracked > 0}>
                  <StatTitle>Total Days Tracked</StatTitle>
                  <StatValue color="info">
                    {calculateTotalDaysTracked()} days
                  </StatValue>
                </StatBox>
                
                <StatBox highlight={yearlyStats.currentWeight !== null}>
                  <StatTitle>Current Weight</StatTitle>
                  <StatValue color="secondary">
                    {yearlyStats.currentWeight !== null ? 
                      `${yearlyStats.currentWeight} lbs` : 
                      'Not logged'}
                  </StatValue>
                </StatBox>
              </StatsGrid>
            </YearlySummary>
          </SummaryCard>
          
          {/* Chart Card for Net Calories */}
          <Card>
            <ChartHeader>
              <Title size="1.25rem">Monthly Net Calories for {selectedYear}</Title>
              <Text>Positive values represent calorie surplus, negative values represent calorie deficit</Text>
            </ChartHeader>
            
            <ChartContainer>
              {prepareYearlyChartData() ? (
                <Bar data={prepareYearlyChartData()} options={chartOptions} />
              ) : (
                <EmptyState>
                  <span className="material-symbols-outlined">insert_chart</span>
                  <Text>No data available for {selectedYear}.</Text>
                  <Text>Start logging your food and exercise to see your yearly trends!</Text>
                </EmptyState>
              )}
            </ChartContainer>
          </Card>
          
          {/* New Card for Food Calories */}
          <Card>
            <ChartHeader>
              <Title size="1.25rem">Monthly Food Calories for {selectedYear}</Title>
              <Text>Tracking your food intake throughout the year</Text>
            </ChartHeader>
            
            <ChartContainer>
              {prepareFoodCaloriesChartData() ? (
                <Bar data={prepareFoodCaloriesChartData()} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Food Calories: ${context.parsed.y.toLocaleString()} cal`;
                        }
                      }
                    }
                  },
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Food Calories'
                      }
                    }
                  }
                }} />
              ) : (
                <EmptyState>
                  <span className="material-symbols-outlined">restaurant</span>
                  <Text>No food data available for {selectedYear}.</Text>
                  <Text>Start logging your meals to see your consumption patterns!</Text>
                </EmptyState>
              )}
            </ChartContainer>
          </Card>
          
          {/* New Card for Exercise Calories */}
          <Card>
            <ChartHeader>
              <Title size="1.25rem">Monthly Exercise Calories for {selectedYear}</Title>
              <Text>Tracking your activity throughout the year</Text>
            </ChartHeader>
            
            <ChartContainer>
              {prepareExerciseCaloriesChartData() ? (
                <Bar data={prepareExerciseCaloriesChartData()} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `Exercise Calories: ${context.parsed.y.toLocaleString()} cal`;
                        }
                      }
                    }
                  },
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Exercise Calories'
                      }
                    }
                  }
                }} />
              ) : (
                <EmptyState>
                  <span className="material-symbols-outlined">fitness_center</span>
                  <Text>No exercise data available for {selectedYear}.</Text>
                  <Text>Start logging your workouts to track your activity!</Text>
                </EmptyState>
              )}
            </ChartContainer>
          </Card>
          
          {/* New Weight Tracking Chart */}
          <Card>
            <ChartHeader>
              <Title size="1.25rem">Weight Tracking for {selectedYear}</Title>
              <Text>Your weight journey throughout the year</Text>
            </ChartHeader>
            
            <ChartContainer>
              {prepareWeightChartData() ? (
                <Line data={prepareWeightChartData()} options={weightChartOptions} />
              ) : (
                <EmptyState>
                  <span className="material-symbols-outlined">monitor_weight</span>
                  <Text>No weight data available for {selectedYear}.</Text>
                  <Text>Start logging your weight to track your progress!</Text>
                </EmptyState>
              )}
            </ChartContainer>
          </Card>
          
          {/* Monthly Breakdown Card */}
          <Card>
            <Title size="1.25rem">Monthly Breakdown</Title>
            
            {yearlyData && yearlyData.monthly_entries && yearlyData.monthly_entries.length > 0 ? (
              <TableWrapper>
                <MonthlyTable>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Net Calories</th>
                      <th>Est. Weight Change</th>
                      <th>Days Tracked</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthNames.map((monthName, index) => {
                      // Find the entry for this month (if it exists)
                      const monthEntry = yearlyData.monthly_entries.find(entry => entry.month === index + 1);
                      
                      // Check if there's food or exercise data
                      const hasData = monthEntry && (
                        monthEntry.total_food_calories > 0 || 
                        monthEntry.total_exercise_calories > 0
                      );
                      
                      // Calculate adjusted net calories if we have data
                      let adjustedNetCalories = 0;
                      if (monthEntry && hasData && monthEntry.days_with_data > 0 && monthEntry.days_in_month > 0) {
                        adjustedNetCalories = Math.round(
                          (monthEntry.net_calories || 0) * (monthEntry.days_with_data / monthEntry.days_in_month)
                        );
                      }
                      
                      const weightChange = adjustedNetCalories / 3500; // 3500 calories = 1 lb
                      
                      return (
                        <tr key={index} className={!hasData ? 'inactive' : ''}>
                          <td>{monthName}</td>
                          <td 
                            className={adjustedNetCalories < 0 ? 'negative' : adjustedNetCalories > 0 ? 'positive' : ''}
                          >
                            {adjustedNetCalories.toLocaleString()}
                          </td>
                          <td
                            className={weightChange < 0 ? 'negative' : weightChange > 0 ? 'positive' : ''}
                          >
                            {!hasData ? '-' : `${Math.abs(weightChange).toFixed(1)} lbs ${weightChange < 0 ? 'loss' : 'gain'}`}
                          </td>
                          <td>
                            {monthEntry && monthEntry.days_with_data ? 
                              `${monthEntry.days_with_data}/${monthEntry.days_in_month} days` : 
                              'None'}
                          </td>
                          <td>
                            {!hasData ? (
                              <StatusBadge variant="neutral">No Data</StatusBadge>
                            ) : adjustedNetCalories < -7000 ? (
                              <StatusBadge variant="primary">Strong Deficit</StatusBadge>
                            ) : adjustedNetCalories < 0 ? (
                              <StatusBadge variant="secondary">Moderate Deficit</StatusBadge>
                            ) : adjustedNetCalories < 7000 ? (
                              <StatusBadge variant="warning">Moderate Surplus</StatusBadge>
                            ) : (
                              <StatusBadge variant="danger">Strong Surplus</StatusBadge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </MonthlyTable>
              </TableWrapper>
            ) : (
              <EmptyState>
                <span className="material-symbols-outlined">table_view</span>
                <Text>No monthly data available for {selectedYear}.</Text>
              </EmptyState>
            )}
          </Card>
          
          {/* Yearly Insights Card */}
          <Card>
            <Title size="1.25rem">Yearly Insights</Title>
            
            {yearlyData && yearlyData.monthly_entries && yearlyData.monthly_entries.length > 0 ? (
              <InsightsContainer>
                <InsightItem>
                  <InsightIcon color="primary">
                    <span className="material-symbols-outlined">stars</span>
                  </InsightIcon>
                  <InsightContent>
                    <InsightTitle>Best Month</InsightTitle>
                    <InsightValue>
                      {(() => {
                        // Find month with lowest (most negative) net calories
                        const entriesWithData = [...yearlyData.monthly_entries].filter(entry => 
                          entry.total_food_calories > 0 || entry.total_exercise_calories > 0
                        );
                        
                        const bestEntry = entriesWithData.length > 0 ?
                          entriesWithData.sort((a, b) => (a.net_calories || 0) - (b.net_calories || 0))[0] :
                          null;
                        
                        return bestEntry ? (
                          <>
                            {monthNames[bestEntry.month - 1]} with {(bestEntry.net_calories || 0).toLocaleString()} calories
                          </>
                        ) : 'No data';
                      })()}
                    </InsightValue>
                  </InsightContent>
                </InsightItem>
                
                <InsightItem>
                  <InsightIcon color="danger">
                    <span className="material-symbols-outlined">trending_down</span>
                  </InsightIcon>
                  <InsightContent>
                    <InsightTitle>Challenging Month</InsightTitle>
                    <InsightValue>
                      {(() => {
                        // Find month with highest (most positive) net calories
                        const entriesWithData = [...yearlyData.monthly_entries].filter(entry => 
                          entry.total_food_calories > 0 || entry.total_exercise_calories > 0
                        );
                        
                        const challengingEntry = entriesWithData.length > 0 ?
                          entriesWithData.sort((a, b) => (b.net_calories || 0) - (a.net_calories || 0))[0] :
                          null;
                        
                        return challengingEntry ? (
                          <>
                            {monthNames[challengingEntry.month - 1]} with {(challengingEntry.net_calories || 0).toLocaleString()} calories
                          </>
                        ) : 'No data';
                      })()}
                    </InsightValue>
                  </InsightContent>
                </InsightItem>
                
                <InsightItem>
                  <InsightIcon color="secondary">
                    <span className="material-symbols-outlined">insights</span>
                  </InsightIcon>
                  <InsightContent>
                    <InsightTitle>Overall Trend</InsightTitle>
                    <InsightValue>
                      {yearlyStats.totalNetCalories < -10000 ? (
                        'Strong progress toward weight loss goals'
                      ) : yearlyStats.totalNetCalories < 0 ? (
                        'Moderate progress toward weight loss goals'
                      ) : yearlyStats.totalNetCalories < 10000 ? (
                        'Slight calorie surplus for the year'
                      ) : (
                        'Significant calorie surplus for the year'
                      )}
                    </InsightValue>
                  </InsightContent>
                </InsightItem>
                
                <InsightItem>
                  <InsightIcon color="warning">
                    <span className="material-symbols-outlined">recommend</span>
                  </InsightIcon>
                  <InsightContent>
                    <InsightTitle>Recommendation</InsightTitle>
                    <InsightValue>
                      {yearlyStats.totalNetCalories < 0 ? (
                        'Continue your current approach - you\'re making progress!'
                      ) : yearlyStats.monthsTracked < 3 ? (
                        'Track consistently to get better insights'
                      ) : yearlyStats.totalNetCalories > 10000 ? (
                        'Consider adjusting your calorie intake or increasing activity'
                      ) : (
                        'Make small adjustments to achieve a calorie deficit'
                      )}
                    </InsightValue>
                  </InsightContent>
                </InsightItem>
              </InsightsContainer>
            ) : (
              <EmptyState>
                <span className="material-symbols-outlined">psychology</span>
                <Text>No insights available for {selectedYear}.</Text>
                <Text>Start tracking your nutrition consistently to see personalized insights!</Text>
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

const YearNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const YearSelector = styled.div`
  min-width: 100px;
  
  select {
    width: 100%;
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

const YearlySummary = styled.div`
  padding: 0.5rem;
`;

const SummaryTitle = styled.h3`
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  font-weight: 500;
  text-align: center;
`;

const StatsGrid = styled.div`
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

const StatBox = styled.div`
  background-color: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme, highlight }) => 
    highlight ? theme.colors.primary + '44' : theme.colors.neutral + '22'};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1.5rem;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
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
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    height: 300px;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const MonthlyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral}22;
  }
  
  th {
    font-weight: 500;
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  tbody tr:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  tbody tr.inactive {
    opacity: 0.6;
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  td.positive {
    color: ${({ theme }) => theme.colors.danger};
  }
  
  td.negative {
    color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    th, td {
      padding: 0.5rem;
      font-size: 0.875rem;
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${({ theme, variant }) => 
    theme.colors[variant] || theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
`;

const InsightsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const InsightItem = styled.div`
  display: flex;
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

const InsightIcon = styled.div`
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

const InsightContent = styled.div`
  flex: 1;
`;

const InsightTitle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin-bottom: 0.25rem;
`;

const InsightValue = styled.div`
  font-weight: 500;
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

export default YearlyReport;