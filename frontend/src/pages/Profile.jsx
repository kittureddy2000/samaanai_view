import React from 'react';
import styled from 'styled-components';

const Profile = () => {
    return (
        <Container>
            <Title>User Profile</Title>
            <p>Profile settings are coming soon.</p>
        </Container>
    );
};

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
`;

export default Profile;
