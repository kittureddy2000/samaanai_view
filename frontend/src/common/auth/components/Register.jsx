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
} from '../../components/UI';

const Register = () => {
  const { register, currentUser, error, setError } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleRegister = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      setError('');

      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        password2: values.confirmPassword,
        first_name: values.firstName,
        last_name: values.lastName,
      });

      // On successful registration, navigate to home
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      // Error is set by AuthContext
      setSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    sessionStorage.setItem('postLoginRedirect', '/');

    const baseUrl = import.meta.env.VITE_API_URL ?
      import.meta.env.VITE_API_URL.replace(/\/api$/, '') :
      'http://localhost:8000';

    const socialAuthUrl = `${baseUrl}/api/auth/social/login/google-oauth2/`;
    window.location.href = socialAuthUrl;
  };

  const registerValidationSchema = Yup.object({
    firstName: Yup.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters'),
    lastName: Yup.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters'),
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .required('Username is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
  });

  return (
    <RegisterContainer>
      <RegisterCard>
        <LogoContainer>
          <LogoIcon className="material-symbols-outlined">monitoring</LogoIcon>
          <LogoText>Samaanai</LogoText>
        </LogoContainer>

        <Title size="1.75rem" align="center">Create Account</Title>
        <Text align="center">Join us and start managing your finances</Text>

        {error && (
          <ErrorBanner>
            <Text color="white" noMargin>{error}</Text>
          </ErrorBanner>
        )}

        <Formik
          initialValues={{
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
          }}
          validationSchema={registerValidationSchema}
          onSubmit={handleRegister}
        >
          {({ isSubmitting }) => (
            <Form>
              <NameRow>
                <FormGroup>
                  <Label htmlFor="firstName">First Name</Label>
                  <Field
                    as={Input}
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    autoComplete="given-name"
                  />
                  <ErrorMessage name="firstName" component={ErrorText} />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Field
                    as={Input}
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                  <ErrorMessage name="lastName" component={ErrorText} />
                </FormGroup>
              </NameRow>

              <FormGroup>
                <Label htmlFor="username">Username *</Label>
                <Field
                  as={Input}
                  id="username"
                  name="username"
                  placeholder="johndoe"
                  autoComplete="username"
                />
                <ErrorMessage name="username" component={ErrorText} />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="email">Email *</Label>
                <Field
                  as={Input}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                />
                <ErrorMessage name="email" component={ErrorText} />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="password">Password *</Label>
                <Field
                  as={Input}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <ErrorMessage name="password" component={ErrorText} />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Field
                  as={Input}
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <ErrorMessage name="confirmPassword" component={ErrorText} />
              </FormGroup>

              <RegisterButton
                type="submit"
                $fullwidth
                disabled={isSubmitting || loading}
              >
                {loading ? (
                  <>
                    <Spinner size="16px" />
                    <span>Creating account...</span>
                  </>
                ) : 'Create Account'}
              </RegisterButton>

              <OrSeparator>
                <OrLine />
                <OrText>or</OrText>
                <OrLine />
              </OrSeparator>

              <GoogleButton
                type="button"
                onClick={handleGoogleSignup}
                $fullwidth
              >
                <FaGoogle style={{ marginRight: '8px' }} />
                Sign up with Google
              </GoogleButton>
            </Form>
          )}
        </Formik>

        <LoginPrompt>
          <span>Already have an account?</span>
          <LoginLink to="/login">Sign in</LoginLink>
        </LoginPrompt>
      </RegisterCard>
    </RegisterContainer>
  );
};

// Styled Components
const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
`;

const RegisterCard = styled(Card)`
  width: 100%;
  max-width: 520px;
  padding: 2.5rem 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
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

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const RegisterButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.875rem 1.5rem;
  margin-bottom: 1rem;
  
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
  margin: 1rem 0;
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
  margin-bottom: 1.5rem;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
  }
`;

const LoginPrompt = styled.div`
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  
  span {
    margin-right: 0.5rem;
  }
`;

const LoginLink = styled(Link)`
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default Register;
