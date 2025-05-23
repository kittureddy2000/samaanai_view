import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';

import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  Button,
  Title,
  Text,
  FormGroup,
  Label,
  Input,
  ErrorText,
  Spinner,
  Grid,
  Divider
} from 'common/components/UI';

const Profile = () => {
  const { currentUser, updateProfile, updateMetrics, error: authError, setError } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Debug useEffect to check currentUser and profile on load
  useEffect(() => {
    console.log('Current User Object:', currentUser);
    console.log('Has profile?', currentUser && !!currentUser.profile);
    if (currentUser && currentUser.profile) {
      console.log('Profile data:', currentUser.profile);
    }
  }, [currentUser]);
  
  // Calculate BMR based on user data
  const calculateBMR = () => {
    if (!currentUser || !currentUser.profile) return null;
    
    const { height, weight, date_of_birth } = currentUser.profile;
    if (!height || !weight || !date_of_birth) return null;
    
    // Parse date of birth
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) return null;
    
    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    // Convert weight from lbs to kg for the formula
    const weightInKg = weight * 0.453592;
    
    // Determine gender (this is a simplified approach)
    // In a real app, you would have gender stored in the user profile
    const isMale = true; // Placeholder
    
    // Mifflin-St Jeor Equation for BMR
    if (isMale) {
      return Math.round((10 * weightInKg) + (6.25 * height) - (5 * age) + 5);
    } else {
      return Math.round((10 * weightInKg) + (6.25 * height) - (5 * age) - 161);
    }
  };
  
  const estimatedBMR = calculateBMR();
  
  // Calculate daily calorie target
  const calculateDailyTarget = (metabolicRate, weightLossGoal) => {
    if (!metabolicRate) return 'Set your metabolic rate to see target';
    
    // Correct formula based on weight loss goal direction
    // If weightLossGoal is positive (weight loss), subtract calories
    // If weightLossGoal is negative (weight gain), add calories
    const calorieAdjustment = (Math.abs(weightLossGoal) * 3500) / 7;
    
    if (weightLossGoal > 0) {
      // Weight loss - subtract calories
      return `${Math.round(metabolicRate - calorieAdjustment)} calories`;
    } else if (weightLossGoal < 0) {
      // Weight gain - add calories
      return `${Math.round(metabolicRate + calorieAdjustment)} calories`;
    } else {
      // Maintain weight
      return `${metabolicRate} calories`;
    }
  };
  
  const handleProfileSubmit = async (values) => {
    try {
      setLoading(true);
      setSuccessMessage('');
      if (typeof setError === 'function') {
        setError('');
      }
      
      // For simplicity, we'll combine updateProfile and updateMetrics
      // First update metrics data
      await updateMetrics({
        weight: values.weight,
        height: values.height,
        date_of_birth: values.dateOfBirth ? format(values.dateOfBirth, 'yyyy-MM-dd') : null,
        metabolic_rate: values.metabolicRate,
        weight_loss_goal: values.weightLossGoal,
        start_of_week: values.startOfWeek
      });
      
      // Then update profile data
      await updateProfile({
        username: values.username,
        email: values.email,
        // Add any other profile fields here
      });
      
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      if (typeof setError === 'function') {
        setError(err.message || 'Failed to update profile.');
      } else {
        console.error("setError from useAuth is not a function");
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !currentUser) {
    return <div>Loading profile...</div>;
  }
  
  return (
    <div>
      <Title>User Profile</Title>
      
      {authError && (
        <ErrorBanner>
          <Text color="white" noMargin>{authError}</Text>
        </ErrorBanner>
      )}
      
      {successMessage && (
        <SuccessBanner>
          <Text color="white" noMargin>{successMessage}</Text>
        </SuccessBanner>
      )}
      
      <Card>
        <Title size="1.25rem">User Information & Health Metrics</Title>
        <Text>Update your account details and health information</Text>
        
        <Formik
          initialValues={{
            // User Information
            username: currentUser?.username || '',
            email: currentUser?.email || '',
            
            // Health Metrics
            height: currentUser?.profile?.height || '',
            weight: currentUser?.profile?.weight || '',
            dateOfBirth: currentUser?.profile?.date_of_birth ? parseISO(currentUser.profile.date_of_birth) : null,
            metabolicRate: currentUser?.profile?.metabolic_rate || '',
            weightLossGoal: currentUser?.profile?.weight_loss_goal !== undefined ? currentUser.profile.weight_loss_goal : 0,
            
            // Report Settings
            startOfWeek: currentUser?.profile?.start_of_week !== undefined ? currentUser.profile.start_of_week : 2,
          }}
          validationSchema={Yup.object({
            // User Information Validation
            username: Yup.string().max(30, 'Username must be 30 characters or less'),
            email: Yup.string().email('Invalid email address').required('Email is required'),
            
            // Health Metrics Validation
            height: Yup.number()
              .nullable()
              .min(50, 'Height must be at least 50 cm')
              .max(300, 'Height must be less than 300 cm'),
            weight: Yup.number()
              .nullable()
              .min(50, 'Weight must be at least 50 lbs')
              .max(500, 'Weight must be less than 500 lbs'),
            dateOfBirth: Yup.date()
              .nullable()
              .max(new Date(), 'Date of birth cannot be in the future'),
            metabolicRate: Yup.number()
              .nullable()
              .required('Metabolic rate is required for calorie calculations')
              .min(500, 'Metabolic rate must be at least 500 calories')
              .max(5000, 'Metabolic rate must be less than 5000 calories'),
            weightLossGoal: Yup.number()
              .required('Weight loss goal is required')
              .min(-2, 'Maximum weight gain goal is 2 lbs per week')
              .max(2, 'Maximum weight loss goal is 2 lbs per week'),
              
            // Report Settings Validation
            startOfWeek: Yup.number()
              .required('Start of week is required')
              .min(0, 'Invalid start of week')
              .max(6, 'Invalid start of week')
          })}
          onSubmit={handleProfileSubmit}
          enableReinitialize
        >
          {({ errors, touched, setFieldValue, values, isSubmitting }) => (
            <Form>
              <SectionTitle>Account Information</SectionTitle>
              
              <Grid columns="1fr 1fr" mobileColumns="1fr" gap="md">
                <FormGroup>
                  <Label htmlFor="username">Username</Label>
                  <Field
                    as={Input}
                    id="username"
                    name="username"
                    type="text"
                    disabled
                  />
                  {errors.username && touched.username ? (
                    <ErrorText>{errors.username}</ErrorText>
                  ) : null}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="email">Email Address</Label>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                  />
                  {errors.email && touched.email ? (
                    <ErrorText>{errors.email}</ErrorText>
                  ) : null}
                </FormGroup>
              </Grid>
              
              <Divider margin="1.5rem 0" />
              <SectionTitle>Body Measurements</SectionTitle>
              
              <Grid columns="1fr 1fr" mobileColumns="1fr" gap="md">
                <FormGroup>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Field
                    as={Input}
                    id="height"
                    name="height"
                    type="number"
                    step="0.1"
                    min="50"
                    max="300"
                  />
                  {errors.height && touched.height ? (
                    <ErrorText>{errors.height}</ErrorText>
                  ) : null}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Field
                    as={Input}
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    min="50"
                    max="500"
                  />
                  {errors.weight && touched.weight ? (
                    <ErrorText>{errors.weight}</ErrorText>
                  ) : null}
                </FormGroup>
              </Grid>
              
              <FormGroup>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <DatePickerWrapper>
                  <DatePicker
                    selected={values.dateOfBirth}
                    onChange={date => setFieldValue('dateOfBirth', date)}
                    dateFormat="yyyy-MM-dd"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={100}
                    maxDate={new Date()}
                    placeholderText="Select your date of birth"
                    customInput={<StyledDateInput />}
                  />
                </DatePickerWrapper>
                {errors.dateOfBirth && touched.dateOfBirth ? (
                  <ErrorText>{errors.dateOfBirth}</ErrorText>
                ) : null}
              </FormGroup>
              
              <Divider margin="1.5rem 0" />
              <SectionTitle>Metabolic Rate</SectionTitle>
              <Text>Your Basal Metabolic Rate (BMR) is the number of calories your body needs at rest</Text>
              
              {estimatedBMR && (
                <SuggestionBox>
                  <SuggestionContent>
                    <span className="material-symbols-outlined">tips_and_updates</span>
                    <div>
                      <SuggestionTitle>Estimated BMR</SuggestionTitle>
                      <Text noMargin>
                        Based on your height, weight, and age, your estimated BMR is around <strong>{estimatedBMR} calories</strong> per day.
                      </Text>
                    </div>
                  </SuggestionContent>
                  <Button 
                    size="small" 
                    onClick={() => setFieldValue('metabolicRate', estimatedBMR)}
                    type="button"
                  >
                    Use Estimate
                  </Button>
                </SuggestionBox>
              )}
              
              <FormGroup>
                <Label htmlFor="metabolicRate">
                  Daily Metabolic Rate (calories)
                  <RequiredIndicator>*</RequiredIndicator>
                </Label>
                <Field
                  as={Input}
                  id="metabolicRate"
                  name="metabolicRate"
                  type="number"
                  min="500"
                  max="5000"
                />
                {errors.metabolicRate && touched.metabolicRate ? (
                  <ErrorText>{errors.metabolicRate}</ErrorText>
                ) : null}
              </FormGroup>
              
              <Divider margin="1.5rem 0" />
              <SectionTitle>Weight Management Goal</SectionTitle>
              <Text>Set your weekly weight change target</Text>
              
              <FormGroup>
                <Label htmlFor="weightLossGoal">
                  Weekly Weight Change (lbs)
                  <RequiredIndicator>*</RequiredIndicator>
                </Label>
                <Field
                  as={RangeInput}
                  id="weightLossGoal"
                  name="weightLossGoal"
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                />
                <RangeLabels>
                  <RangeLabel>-2 lbs/week (gain)</RangeLabel>
                  <RangeLabel>Maintain</RangeLabel>
                  <RangeLabel>+2 lbs/week (lose)</RangeLabel>
                </RangeLabels>
                <RangeValue goal={values.weightLossGoal}>
                  {values.weightLossGoal > 0 ? (
                    <span>Lose {Math.abs(values.weightLossGoal)} lbs per week</span>
                  ) : values.weightLossGoal < 0 ? (
                    <span>Gain {Math.abs(values.weightLossGoal)} lbs per week</span>
                  ) : (
                    <span>Maintain current weight</span>
                  )}
                </RangeValue>
                {errors.weightLossGoal && touched.weightLossGoal ? (
                  <ErrorText>{errors.weightLossGoal}</ErrorText>
                ) : null}
              </FormGroup>
              
              <Divider margin="1.5rem 0" />
              <SectionTitle>Weekly Report Settings</SectionTitle>
              <Text>Customize how your weekly reports are displayed</Text>
              
              <FormGroup>
                <Label htmlFor="startOfWeek">
                  Start of Week
                </Label>
                <Field
                  as="select"
                  id="startOfWeek"
                  name="startOfWeek"
                  className="form-select"
                >
                  <option value={0}>Monday</option>
                  <option value={1}>Tuesday</option>
                  <option value={2}>Wednesday</option>
                  <option value={3}>Thursday</option>
                  <option value={4}>Friday</option>
                  <option value={5}>Saturday</option>
                  <option value={6}>Sunday</option>
                </Field>
                {errors.startOfWeek && touched.startOfWeek ? (
                  <ErrorText>{errors.startOfWeek}</ErrorText>
                ) : null}
              </FormGroup>
              
              <CalorieTarget>
                <CalorieTargetTitle>Daily Calorie Target:</CalorieTargetTitle>
                <CalorieTargetValue>
                  {calculateDailyTarget(values.metabolicRate, values.weightLossGoal)}
                </CalorieTargetValue>
              </CalorieTarget>
              
              <ButtonContainer>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="16px" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </ButtonContainer>
            </Form>
          )}
        </Formik>
      </Card>
      
      {/* Info Card */}
      <Card>
        <InfoBox>
          <InfoTitle>
            <span className="material-symbols-outlined">info</span>
            <span>Why Metabolic Rate Matters</span>
          </InfoTitle>
          <InfoContent>
            <Text>
              Your metabolic rate is the foundation for tracking calories effectively.
              It represents how many calories your body needs each day to maintain your current weight.
            </Text>
            <Text>
              For weight loss, consume fewer calories than your metabolic rate.
              For weight gain, consume more calories than your metabolic rate.
            </Text>
            <Text noMargin>
              A healthy rate of weight loss is 0.5-2 pounds per week, which translates to
              a daily calorie deficit of 250-1000 calories.
            </Text>
          </InfoContent>
        </InfoBox>
      </Card>
    </div>
  );
};

// Styled components
const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1rem;
`;

const SuccessBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: ${({ theme }) => theme.colors.dark};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  margin-left: 0.25rem;
`;

const StyledDateInput = styled(Input)`
  width: 100%;
`;

const DatePickerWrapper = styled.div`
  .react-datepicker-wrapper {
    width: 100%;
  }
  
  .react-datepicker {
    font-family: ${({ theme }) => theme.fonts.body};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  .react-datepicker__header {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
  }
  
  .react-datepicker__current-month {
    color: white;
  }
  
  .react-datepicker__day-name {
    color: white;
  }
  
  .react-datepicker__day--selected {
    background-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SuggestionBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ theme }) => theme.colors.light};
  border: 1px solid ${({ theme }) => theme.colors.primary}33;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: flex-start;
    
    button {
      margin-top: 1rem;
      align-self: flex-end;
    }
  }
`;

const SuggestionContent = styled.div`
  display: flex;
  align-items: center;
  
  span.material-symbols-outlined {
    font-size: 24px;
    color: ${({ theme }) => theme.colors.primary};
    margin-right: 1rem;
  }
`;

const SuggestionTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const RangeInput = styled(Input)`
  -webkit-appearance: none;
  height: 8px;
  border-radius: 5px;
  background: ${({ theme }) => theme.colors.neutral}33;
  outline: none;
  margin: 1rem 0;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const RangeLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral};
`;

const RangeValue = styled.div`
  text-align: center;
  font-weight: 500;
  margin-bottom: 1rem;
  color: ${({ theme, goal }) => 
    goal > 0 ? theme.colors.primary : 
    goal < 0 ? theme.colors.warning : 
    theme.colors.dark};
`;

const CalorieTarget = styled.div`
  background-color: ${({ theme }) => theme.colors.light};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1rem;
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const CalorieTargetTitle = styled.div`
  font-weight: 500;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    margin-bottom: 0.5rem;
  }
`;

const CalorieTargetValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const InfoBox = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.light};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const InfoTitle = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  font-weight: 500;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral}22;
  
  span.material-symbols-outlined {
    margin-right: 0.5rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const InfoContent = styled.div`
  padding: 1rem;
  
  p:last-child {
    margin-bottom: 0;
  }
`;

export default Profile;