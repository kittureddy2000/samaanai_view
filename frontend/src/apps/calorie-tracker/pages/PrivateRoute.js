import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from 'common/components/UI';
import styled from 'styled-components';

const PrivateRoute = ({ element }) => {
  const { currentUser, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="40px" />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Render the protected component
  return element;
};

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.light};
`;

const LoadingText = styled.div`
  margin-top: 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.dark};
`;

export default PrivateRoute;