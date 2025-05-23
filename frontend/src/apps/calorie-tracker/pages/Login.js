import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FaGoogle } from 'react-icons/fa';

import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  Button,
  FormGroup,
  Label,
  Input,
  ErrorText,
  Title,
  Text,
  Spinner
} from 'common/components/UI';

const Login = () => {
  const { login, currentUser, error, setError, setAuthTokens } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  const handleLogin = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      setError('');
      const tokens = await login(values.username, values.password);
      if (tokens && tokens.access && tokens.refresh) {
        setAuthTokens(tokens.access, tokens.refresh);
        navigate('/');
      } else {
        throw new Error("Login successful but tokens not received.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setSubmitting(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = () => {
    console.log('Google login button clicked');
    
    // IMPORTANT: Backend expects URLs with format: http://domain/api/auth/social/login/google-oauth2/
    // Extract the base domain (without /api) from REACT_APP_API_URL
    let baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4); // Remove /api suffix
    }
    
    // Now build the full URL with the correct path structure
    const socialAuthUrl = `${baseUrl}/api/auth/social/login/google-oauth2/`;
    
    console.log('Redirecting to:', socialAuthUrl);
    window.location.href = socialAuthUrl;
  };
  
  // Validation schema
  const loginValidationSchema = Yup.object({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required')
  });
  
  return (
    <LoginContainer>
      <LoginCard>
        <LogoContainer>
          <LogoIcon className="material-symbols-outlined">monitoring</LogoIcon>
          <LogoText>CalorieTracker</LogoText>
        </LogoContainer>
        
        <Title size="1.75rem" align="center">Welcome Back</Title>
        <Text align="center">Sign in to your account to continue</Text>
        
        {error && (
          <ErrorBanner>
            <Text color="white" noMargin>{error}</Text>
          </ErrorBanner>
        )}
        
        <Formik
          initialValues={{
            username: '',
            password: ''
          }}
          validationSchema={loginValidationSchema}
          onSubmit={handleLogin}
        >
          {({ isSubmitting }) => (
            <Form>
              <FormGroup>
                <Label htmlFor="username">Username</Label>
                <Field
                  as={Input}
                  id="username"
                  name="username"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
                <ErrorMessage name="username" component={ErrorText} />
              </FormGroup>
              
              <FormGroup>
                <PasswordHeader>
                  <Label htmlFor="password">Password</Label>
                  <ForgotPassword to="/forgot-password">Forgot Password?</ForgotPassword>
                </PasswordHeader>
                <Field
                  as={Input}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <ErrorMessage name="password" component={ErrorText} />
              </FormGroup>
              
              <LoginButton 
                type="submit" 
                fullwidth 
                disabled={isSubmitting || loading}
              >
                {loading ? (
                  <>
                    <Spinner size="16px" />
                    <span>Signing in...</span>
                  </>
                ) : 'Sign In'}
              </LoginButton>
              
              <OrSeparator>
                <OrLine />
                <OrText>or</OrText>
                <OrLine />
              </OrSeparator>
              
              <GoogleButton 
                type="button"
                onClick={handleGoogleLogin}
                fullwidth
              >
                <FaGoogle style={{ marginRight: '8px' }} />
                Sign in with Google
              </GoogleButton>
            </Form>
          )}
        </Formik>
        
        <RegisterPrompt>
          <span>Don't have an account?</span>
          <RegisterLink to="/register">Sign up</RegisterLink>
        </RegisterPrompt>
      </LoginCard>
      
      {/* <AppFeatures>
        <FeatureCard>
          <FeatureIcon className="material-symbols-outlined">restaurant</FeatureIcon>
          <FeatureTitle>Track Your Nutrition</FeatureTitle>
          <FeatureText>
            Easily log meals and exercises with our simple interface
          </FeatureText>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon className="material-symbols-outlined">insights</FeatureIcon>
          <FeatureTitle>Insightful Reports</FeatureTitle>
          <FeatureText>
            Get weekly, monthly, and yearly nutrition breakdowns
          </FeatureText>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon className="material-symbols-outlined">trending_down</FeatureIcon>
          <FeatureTitle>Reach Your Goals</FeatureTitle>
          <FeatureText>
            Set targets and track your progress over time
          </FeatureText>
        </FeatureCard>
      </AppFeatures> */}

    </LoginContainer>
  );
};

// Styled components
const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}22, ${({ theme }) => theme.colors.secondary}33);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1rem;
  }
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  margin: 0 auto 2rem;
  padding: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1.5rem;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
`;

const LogoIcon = styled.span`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-right: 0.5rem;
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.dark};
  margin: 0;
`;

const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin: 1rem 0;
`;

const PasswordHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ForgotPassword = styled(Link)`
  font-size: 0.8rem;
`;

const LoginButton = styled(Button)`
  margin-top: 1.5rem;
`;

const RegisterPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  
  span {
    margin-right: 0.5rem;
    color: ${({ theme }) => theme.colors.neutral};
  }
`;

const RegisterLink = styled(Link)`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
`;

const AppFeatures = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const FeatureCard = styled.div`
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
  padding: 1.5rem;
  width: 220px;
  text-align: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
    max-width: 400px;
  }
`;

const FeatureIcon = styled.span`
  font-size: 2.5rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.5rem;
  display: block;
`;

const FeatureTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const FeatureText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.neutral};
  margin: 0;
`;

const OrSeparator = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
`;

const OrLine = styled.div`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.light};
`;

const OrText = styled.span`
  padding: 0 1rem;
  color: ${({ theme }) => theme.colors.neutral};
  font-size: 0.9rem;
`;

const GoogleButton = styled(Button)`
  background-color: white;
  color: #757575;
  border: 1px solid #dadce0;
  
  &:hover {
    background-color: #f8f9fa;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
`;

export default Login;