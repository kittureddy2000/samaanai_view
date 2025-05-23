import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from 'common/components/UI';
import styled from 'styled-components';

const SocialLoginCallback = () => {
  const { setAuthTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Debug information
    console.log('SocialLoginCallback: Current URL =', window.location.href);
    console.log('SocialLoginCallback: Search params =', window.location.search);
    
    const params = new URLSearchParams(window.location.search);
    console.log('SocialLoginCallback: All params =', 
      Array.from(params.entries()).reduce((acc, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {}));
      
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    
    console.log('SocialLoginCallback: access token =', access ? 'present' : 'missing');
    console.log('SocialLoginCallback: refresh token =', refresh ? 'present' : 'missing');

    if (access && refresh) {
      setAuthTokens(access, refresh);
      navigate('/dashboard', { replace: true });
    } else {
      console.error("Tokens missing in callback URL");
      navigate('/login?error=token_missing', { replace: true });
    }
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
`;

const SpinnerWrapper = styled.div`
  margin-bottom: 1rem;
`;

const Text = styled.p`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.dark};
`;

export default SocialLoginCallback; 