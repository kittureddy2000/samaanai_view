import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const CallbackContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  textAlign: 'center',
}));

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}. ${errorDescription || ''}`);
          setTimeout(() => navigate('/finance'), 3000);
          return;
        }

        // For Plaid OAuth, we typically just need to handle the state parameter
        // and let Plaid Link handle the rest through its internal mechanisms
        if (state) {
          setStatus('success');
          setMessage('OAuth authentication successful! Redirecting to finance app...');
          
          // Store OAuth success in sessionStorage for Plaid Link to pick up
          sessionStorage.setItem('plaidOAuthSuccess', 'true');
          sessionStorage.setItem('plaidOAuthState', state);
          
          // Redirect back to finance app
          setTimeout(() => navigate('/finance'), 2000);
        } else {
          setStatus('error');
          setMessage('Invalid OAuth callback - missing state parameter');
          setTimeout(() => navigate('/finance'), 3000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An error occurred processing the OAuth callback');
        setTimeout(() => navigate('/finance'), 3000);
      }
    };

    handleOAuthCallback();
  }, [location, navigate]);

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <CallbackContainer>
      <Box sx={{ mb: 3 }}>
        {status === 'processing' && <CircularProgress size={60} />}
      </Box>
      
      <Typography variant="h5" gutterBottom>
        {status === 'processing' && 'Processing OAuth Authentication'}
        {status === 'success' && 'Authentication Successful'}
        {status === 'error' && 'Authentication Error'}
      </Typography>
      
      <Alert severity={getStatusColor()} sx={{ mt: 2, maxWidth: 600 }}>
        {message}
      </Alert>
      
      {status !== 'processing' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          You will be redirected to the finance app shortly...
        </Typography>
      )}
    </CallbackContainer>
  );
};

export default OAuthCallback; 