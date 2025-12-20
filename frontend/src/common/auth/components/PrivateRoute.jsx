import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../../components/UI';
import styled from 'styled-components';

const PrivateRoute = ({ element, children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [forceRedirect, setForceRedirect] = useState(false);

  // Check if there's a token in localStorage
  const hasToken = !!localStorage.getItem('accessToken');

  // Force redirect after 2 seconds if still loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setForceRedirect(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // If no token at all, redirect immediately - don't wait for loading
  if (!hasToken) {
    sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // If force redirect triggered (timeout), redirect to login
  if (forceRedirect && !currentUser) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Show loading spinner while checking authentication (max 2 seconds)
  if (loading && !forceRedirect) {
    return (
      <LoadingContainer>
        <Spinner size="40px" />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    );
  }

  // If not authenticated after loading, redirect to login
  if (!currentUser) {
    sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // User is authenticated, render the component
  return element || children;
};

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f7f8fa;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  font-size: 1.1rem;
  color: #6b7280;
`;

export default PrivateRoute;