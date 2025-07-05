import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FaGoogle, FaFingerprint } from 'react-icons/fa';

import { useAuth } from '../../../common/auth';
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
} from 'common/components/UI';

const Login = () => {
  const { login, currentUser, error, setError, setAuthTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  
  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (currentUser) {
      navigate('/');
    }
    
    // Check if WebAuthn is supported
    if (window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
        setPasskeySupported(available);
      });
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
      const tokens = await login(values.username, values.password);
      if (tokens && tokens.access && tokens.refresh) {
        setAuthTokens(tokens.access, tokens.refresh);
        navigate(nextPath);
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
    // Store the next path for post-login redirect
    sessionStorage.setItem('postLoginRedirect', nextPath);
    
    // Get base URL (remove /api if present)
    const baseUrl = process.env.REACT_APP_API_URL ? 
      process.env.REACT_APP_API_URL.replace(/\/api$/, '') : 
      'http://localhost:8000';
    
    // Construct the social auth URL - this triggers the OAuth flow
    const socialAuthUrl = `${baseUrl}/api/auth/social/login/google-oauth2/?next=${encodeURIComponent(nextPath)}`;
    
    // Redirect to Google OAuth
    window.location.href = socialAuthUrl;
  };

  const handlePasskeyLogin = async (formikValues) => {
    if (!passkeySupported) {
      setError('Passkeys are not supported on this device');
      return;
    }

    try {
      setPasskeyLoading(true);
      setError('');

      // Get username from form values or DOM
      let username = formikValues?.username;
      if (!username) {
        const usernameField = document.getElementById('username');
        username = usernameField?.value;
      }
      
      if (!username?.trim()) {
        setError('Please enter your username first');
        return;
      }

      // Begin authentication
      const beginResponse = await api.post('api/users/webauthn/authenticate/begin/', { 
        username: username.trim() 
      });
      const options = beginResponse.data;

      // Convert base64 strings to ArrayBuffers
      const credentialRequestOptions = {
        challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
        timeout: options.timeout,
        rpId: options.rpId,
        allowCredentials: options.allowCredentials.map(cred => ({
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
          type: cred.type
        })),
        userVerification: options.userVerification
      };

      // Get the credential from the authenticator
      const credential = await navigator.credentials.get({
        publicKey: credentialRequestOptions
      });

      if (!credential) {
        throw new Error('No credential received');
      }

      // Convert ArrayBuffers to base64 for sending to server
      const credentialData = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          userHandle: credential.response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle))) : null
        },
        type: credential.type
      };

      // Complete authentication
      const completeResponse = await api.post('api/users/webauthn/authenticate/complete/', credentialData);
      const result = completeResponse.data;

      if (result.verified && result.access && result.refresh) {
        setAuthTokens(result.access, result.refresh);
        navigate(nextPath);
      } else {
        throw new Error('Authentication failed');
      }

    } catch (err) {
      console.error('Passkey login error:', err);
      setError(err.message || 'Passkey authentication failed');
    } finally {
      setPasskeyLoading(false);
    }
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
              
              {passkeySupported && (
                <PasskeyButton 
                  type="button"
                  onClick={() => handlePasskeyLogin(values)}
                  disabled={passkeyLoading}
                  $fullwidth
                >
                  {passkeyLoading ? (
                    <>
                      <Spinner size="16px" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <FaFingerprint style={{ marginRight: '8px' }} />
                      Sign in with Passkey
                    </>
                  )}
                </PasskeyButton>
              )}
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

const PasskeyButton = styled(Button)`
  background-color: #1a73e8;
  color: white;
  border: 1px solid #1a73e8;
  margin-top: 0.75rem;
  
  &:hover {
    background-color: #1565c0;
    border-color: #1565c0;
  }
  
  &:disabled {
    background-color: #94a3b8;
    border-color: #94a3b8;
  }
`;

export default Login;