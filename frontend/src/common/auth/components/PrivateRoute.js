import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../../components/UI';
import styled from 'styled-components';

const PrivateRoute = ({ element, children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="40px" />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    );
  }

  // If not authenticated, redirect to login with the current path as 'next'
  if (!currentUser) {
    // Store the current path for redirect after login
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