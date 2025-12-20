import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../../components/UI';
import styled from 'styled-components';

const SocialLoginCallback = () => {
  const { setAuthTokens } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Prevent duplicate processing
    if (hasProcessed.current) {
      return;
    }

    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!hasProcessed.current) {
        console.error('SocialLoginCallback: Timeout - redirecting to login');
        navigate('/login?error=callback_timeout', { replace: true });
      }
    }, 10000); // 10 second timeout
    
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    const nextPath = params.get('next') || sessionStorage.getItem('postLoginRedirect') || '/';
    
    if (access && refresh) {
      hasProcessed.current = true;
      
      try {
        setAuthTokens(access, refresh);
        
        // Clear any stored redirect path
        sessionStorage.removeItem('postLoginRedirect');
        
        // Navigate to the intended page
        navigate(nextPath, { replace: true });
        
        // Clear timeout since we're processing successfully
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } catch (error) {
        console.error('SocialLoginCallback: Error setting tokens:', error);
        navigate('/login?error=token_error', { replace: true });
      }
    } else {
      console.error("SocialLoginCallback: Tokens missing in callback URL");
      navigate('/login?error=missing_tokens', { replace: true });
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, setAuthTokens]);

  return (
    <CallbackContainer>
      <SpinnerWrapper>
        <Spinner size="40px" />
      </SpinnerWrapper>
      <Text>Completing login...</Text>
    </CallbackContainer>
  );
};

const CallbackContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SpinnerWrapper = styled.div`
  margin-bottom: 1rem;
`;

const Text = styled.p`
  font-size: 1.2rem;
  color: white;
  text-align: center;
  margin: 0;
`;

export default SocialLoginCallback;