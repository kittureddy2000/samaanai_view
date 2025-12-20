import React from 'react';
import styled from 'styled-components';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const SPPlaceholder = () => {
    return (
        <Container>
            <Content>
                <IconWrapper>
                    <ShowChartIcon sx={{ fontSize: 80, color: '#4caf50' }} />
                </IconWrapper>
                <Title>S&P 500 Analytics</Title>
                <Subtitle>Coming Soon</Subtitle>
                <Description>
                    Track real-time S&P 500 performance, market trends, and portfolio analytics.
                    This feature is currently under development.
                </Description>
            </Content>
        </Container>
    );
};

const Container = styled.div`
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
`;

const Content = styled.div`
  text-align: center;
  padding: 3rem;
  max-width: 500px;
`;

const IconWrapper = styled.div`
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
  border-radius: ${({ theme }) => theme.radius.xl};
  display: inline-block;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.span`
  display: inline-block;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1.1rem;
  line-height: 1.6;
`;

export default SPPlaceholder;
