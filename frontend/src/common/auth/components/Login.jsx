import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FaGoogle } from 'react-icons/fa';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
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
} from '../../components/UI';

const Login = () => {
  const { login, currentUser, error, setError, setAuthTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to intended destination
    if (currentUser) {
      const redirectPath = nextPath !== '/' ? nextPath : '/';
      navigate(redirectPath);
    }

    // Handle OAuth error messages from URL params
    const urlParams = new URLSearchParams(location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      const errorMessages = {
        'social_auth_failed': 'Social authentication failed. Please try again.',
        'token_missing': 'Authentication tokens were not received. Please try again.',
        'token_processing_failed': 'Failed to process authentication tokens. Please try again.',
        'callback_timeout': 'Authentication timed out. Please try again.',
      };
      setError(errorMessages[errorParam] || 'Authentication failed. Please try again.');
    }
  }, [currentUser, navigate, location.search, setError]);

  // Get intended redirect path from query or sessionStorage
  const searchParams = new URLSearchParams(location.search);
  const nextPath = searchParams.get('next') || sessionStorage.getItem('postLoginRedirect') || '/';

  const handleLogin = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      setError('');
      console.log('Attempting login with:', { username: values.username, password: '***' });

      const tokens = await login(values.username, values.password);
      console.log('Login response tokens:', tokens ? 'received' : 'not received');

      if (tokens && tokens.access && tokens.refresh) {
        console.log('Setting tokens and navigating to:', nextPath);
        setAuthTokens(tokens.access, tokens.refresh);
        navigate(nextPath);
      } else {
        throw new Error("Login successful but tokens not received.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || err.message || 'Login failed');
      setSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Store the next path for post-login redirect
    sessionStorage.setItem('postLoginRedirect', nextPath);

    // Get base URL (remove /api if present)
    const baseUrl = import.meta.env.VITE_API_URL ?
      import.meta.env.VITE_API_URL.replace(/\/api$/, '') :
      'http://localhost:8000';

    // Construct the social auth URL - this triggers the OAuth flow
    const socialAuthUrl = `${baseUrl}/api/auth/social/login/google-oauth2/?next=${encodeURIComponent(nextPath)}`;

    // Redirect to Google OAuth
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
          <LogoText>Samaanai</LogoText>
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
          {({ isSubmitting, values }) => (
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
                $fullwidth
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
                $fullwidth
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
    </LoginContainer>
  );
};

// Styled Components
const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 480px;
  padding: 3rem 2.5rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const LogoIcon = styled.span`
  font-size: 2.5rem;
  color: #667eea;
  margin-right: 0.5rem;
`;

const LogoText = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const ErrorBanner = styled.div`
  background: #ef4444;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const PasswordHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ForgotPassword = styled(Link)`
  color: #667eea;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LoginButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.875rem 1.5rem;
  margin-bottom: 1.5rem;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const OrSeparator = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
`;

const OrLine = styled.div`
  flex: 1;
  height: 1px;
  background: #e5e7eb;
`;

const OrText = styled.span`
  margin: 0 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
`;

const GoogleButton = styled(Button)`
  background: #fff;
  border: 2px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
  margin-bottom: 1rem;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
  }
`;


const RegisterPrompt = styled.div`
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  
  span {
    margin-right: 0.5rem;
  }
`;

const RegisterLink = styled(Link)`
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default Login;