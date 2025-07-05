import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import styled from 'styled-components';
import { useAuth } from '../../../common/auth';
import {
  Card,
  Button,
  Title,
  Text,
  FormGroup,
  Label,
  Input,
  ErrorText,
  Spinner
} from 'common/components/UI';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .max(30, 'Username must be 30 characters or less')
        .required('Username is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters long')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required')
    }),
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      setSuccess(false);
      try {
        await register({
          username: values.username,
          email: values.email,
          password: values.password,
          password2: values.confirmPassword
        });
        setSuccess(true);
        setTimeout(() => navigate('/login'), 1500); 
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <RegisterWrapper>
      <Card padding="2rem">
        <Title align="center">Create Account</Title>
        
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {success && <SuccessBanner>Registration successful! Redirecting...</SuccessBanner>}
        
        <form onSubmit={formik.handleSubmit}>
          <FormGroup> 
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username"
              name="username"
              type="text"
              {...formik.getFieldProps('username')}
            />
            {formik.touched.username && formik.errors.username ? (
              <ErrorText>{formik.errors.username}</ErrorText>
            ) : null}
          </FormGroup>
          
          <FormGroup> 
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              name="email"
              type="email"
              {...formik.getFieldProps('email')}
            />
            {formik.touched.email && formik.errors.email ? (
              <ErrorText>{formik.errors.email}</ErrorText>
            ) : null}
          </FormGroup>

          <FormGroup> 
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              name="password"
              type="password"
              {...formik.getFieldProps('password')}
            />
            {formik.touched.password && formik.errors.password ? (
              <ErrorText>{formik.errors.password}</ErrorText>
            ) : null}
          </FormGroup>

          <FormGroup> 
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              {...formik.getFieldProps('confirmPassword')}
            />
            {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
              <ErrorText>{formik.errors.confirmPassword}</ErrorText>
            ) : null}
          </FormGroup>
          
          <Button type="submit" fullWidth disabled={loading || formik.isSubmitting}>
            {loading ? <Spinner size="16px" /> : 'Register'}
          </Button>
        </form>
        
        <Text align="center" style={{ marginTop: '1rem' }}>
          Already have an account? <StyledLink to="/login">Log In</StyledLink>
        </Text>
      </Card>
    </RegisterWrapper>
  );
};

// Styled Components
const RegisterWrapper = styled.div`/* ... */`;
const ErrorBanner = styled.div`/* ... */`;
const SuccessBanner = styled.div`/* ... */`;
const StyledLink = styled(Link)`/* ... */`;

RegisterWrapper.defaultProps = { children: null };
ErrorBanner.defaultProps = { children: null };
SuccessBanner.defaultProps = { children: null };
StyledLink.defaultProps = { children: null, to: '/' };

export default Register;