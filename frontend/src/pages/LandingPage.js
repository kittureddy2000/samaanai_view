import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardActionArea, CardContent, Typography, Container, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../common/auth';

const apps = [
  {
    name: 'Nutrition',
    description: 'Track your meals, calories, and health goals with precision.',
    icon: <FitnessCenterIcon sx={{ fontSize: 80, color: '#4caf50' }} />, 
    path: '/nutrition',
    color: '#4caf50',
    gradient: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)'
  },
  {
    name: 'Finance',
    description: 'Manage your accounts, balances, and spending analytics.',
    icon: <AssessmentIcon sx={{ fontSize: 80, color: '#2196f3' }} />, 
    path: '/finance',
    color: '#2196f3',
    gradient: 'linear-gradient(135deg, #42a5f5 0%, #2196f3 100%)'
  },
];

// Styled Components
const BackgroundContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
  }
}));

const MainContent = styled(Container)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: '80px',
  paddingBottom: '60px',
  position: 'relative',
  zIndex: 1,
}));

const HeroSection = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: '80px',
  color: 'white',
}));

const StyledCard = styled(Card)(({ theme, appcolor }) => ({
  width: 320,
  height: 280,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '24px',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: appcolor || '#2196f3',
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 32px 64px rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 1)',
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  marginBottom: '24px',
  padding: '20px',
  borderRadius: '20px',
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}));

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;

  const handleTileClick = (path) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      sessionStorage.setItem('postLoginRedirect', path);
      navigate(`/login?next=${encodeURIComponent(path)}`);
    }
  };

  return (
    <BackgroundContainer>
      <MainContent maxWidth="lg">
        <HeroSection>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 800, 
              marginBottom: 2,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Welcome to Samaanai
          </Typography>

          {!isAuthenticated && (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                marginTop: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                padding: '12px 32px',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Get Started
            </Button>
          )}
        </HeroSection>

        {/* App Cards */}
        <Grid container spacing={6} justifyContent="center">
          {apps.map((app) => (
            <Grid item key={app.name}>
              <StyledCard appcolor={app.color}>
                <CardActionArea 
                  onClick={() => handleTileClick(app.path)} 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    padding: 3
                  }}
                >
                  <IconContainer>
                    {app.icon}
                  </IconContainer>
                  <CardContent sx={{ textAlign: 'center', padding: 0 }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        marginBottom: 2,
                        color: '#1a1a1a'
                      }}
                    >
                      {app.name}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#666',
                        lineHeight: 1.6,
                        fontSize: '1rem'
                      }}
                    >
                      {app.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        {!isAuthenticated && (
          <Box sx={{ marginTop: 8, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: 2 }}>
              New to Samaanai?
            </Typography>
            <Button
              variant="text"
              onClick={() => navigate('/register')}
              sx={{
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                textDecoration: 'underline',
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              Create an Account
            </Button>
          </Box>
        )}
      </MainContent>
    </BackgroundContainer>
  );
};

export default LandingPage; 