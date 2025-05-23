import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';

import nutritionService from '../services/nutritionService';
// import { useAuth } from '../contexts/AuthContext'; // Removed unused import
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
  Grid
} from 'common/components/UI';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

const WeightTracking = () => {
  // const { currentUser } = useAuth(); // currentUser seems unused, commenting out
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [weightHistory, setWeightHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWeightHistory();
  }, []);

  const fetchWeightHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await nutritionService.getWeightHistory();
      setWeightHistory(data);
    } catch (err) {
      console.error('Error fetching weight history:', err);
      setError('Failed to fetch weight history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await nutritionService.addOrUpdateWeightEntry({
        weight: parseFloat(weight),
        date: format(selectedDate, 'yyyy-MM-dd')
      });
      setWeight('');
      await fetchWeightHistory();
    } catch (err) {
      console.error('Error adding/updating weight entry:', err);
      setError('Failed to save weight entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = {
    labels: weightHistory.map(entry => format(new Date(entry.date), 'MMM d')),
    datasets: [
      {
        label: 'Weight (kg)',
        data: weightHistory.map(entry => entry.weight),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weight Progress'
      }
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  return (
    <div>
      <Title>Weight Tracking</Title>
      
      {error && (
        <ErrorBanner>
          <Text color="white" noMargin>{error}</Text>
        </ErrorBanner>
      )}
      
      <Grid columns="repeat(2, 1fr)" mobileColumns="1fr" gap="lg">
        <Card>
          <Title size="1.25rem">Add Weight Entry</Title>
          <FormGroup>
            <Label>Date</Label>
            <DatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              dateFormat="MMMM d, yyyy"
              customInput={<Input />}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Enter weight"
            />
          </FormGroup>
          
          <Flex justify="flex-end">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !weight}
            >
              {isSubmitting ? 'Saving...' : 'Save Weight'}
            </Button>
          </Flex>
        </Card>
        
        <Card>
          <Title size="1.25rem">Weight History</Title>
          {loading ? (
            <LoadingWrapper>
              <Spinner size="32px" />
              <Text>Loading weight history...</Text>
            </LoadingWrapper>
          ) : (
            <ChartContainer>
              <Line data={chartData} options={chartOptions} />
            </ChartContainer>
          )}
        </Card>
      </Grid>
    </div>
  );
};

const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1rem;
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
`;

const ChartContainer = styled.div`
  height: 400px;
  width: 100%;
`;

export default WeightTracking; 