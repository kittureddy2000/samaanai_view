import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Box, Typography } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import { useAuth } from '../common/auth';

const apps = [
  {
    name: 'S&P',
    description: 'Track S&P 500 performance and market analytics.',
    icon: <ShowChartIcon sx={{ fontSize: 48, color: '#10b981' }} />,
    path: '/sp',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
  },
  {
    name: 'Finance',
    description: 'Manage your accounts, balances, and spending analytics.',
    icon: <AccountBalanceIcon sx={{ fontSize: 48, color: '#6366f1' }} />,
    path: '/finance',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
  },
];

const features = [
  {
    icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
    title: 'Real-time Analytics',
    description: 'Track your portfolio performance with live market data'
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 32 }} />,
    title: 'Bank-level Security',
    description: 'Your data is encrypted and protected with enterprise-grade security'
  },
  {
    icon: <SpeedIcon sx={{ fontSize: 32 }} />,
    title: 'Lightning Fast',
    description: 'Instant syncing with your financial institutions'
  },
];

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
    <PageContainer>
      {/* Animated Background */}
      <AnimatedBackground>
        <GradientOrb1 />
        <GradientOrb2 />
        <GradientOrb3 />
      </AnimatedBackground>

      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <LogoContainer>
            <LogoIcon className="material-symbols-outlined">monitoring</LogoIcon>
            <LogoText>Samaanai</LogoText>
          </LogoContainer>

          <HeroTitle>
            Your Smart
            <br />
            <GradientText>Financial Companion</GradientText>
          </HeroTitle>

          <HeroSubtitle>
            Take control of your finances with intelligent insights,
            real-time tracking, and seamless management across all your accounts.
          </HeroSubtitle>

          {!isAuthenticated && (
            <CTAContainer>
              <PrimaryCTA onClick={() => navigate('/register')}>
                Get Started Free
              </PrimaryCTA>
              <SecondaryCTA onClick={() => navigate('/login')}>
                Sign In
              </SecondaryCTA>
            </CTAContainer>
          )}
        </HeroContent>
      </HeroSection>

      {/* Apps Section */}
      <AppsSection>
        <SectionTitle>Powerful Tools</SectionTitle>
        <SectionSubtitle>
          Everything you need to manage your financial life
        </SectionSubtitle>

        <AppsGrid>
          {apps.map((app) => (
            <AppCard key={app.name} onClick={() => handleTileClick(app.path)}>
              <AppCardGlow $color={app.color} />
              <AppCardContent>
                <AppIconWrapper $gradient={app.gradient}>
                  {app.icon}
                </AppIconWrapper>
                <AppName>{app.name}</AppName>
                <AppDescription>{app.description}</AppDescription>
                <AppArrow className="material-symbols-outlined">arrow_forward</AppArrow>
              </AppCardContent>
            </AppCard>
          ))}
        </AppsGrid>
      </AppsSection>

      {/* Features Section */}
      <FeaturesSection>
        <SectionTitle>Why Samaanai?</SectionTitle>
        <FeaturesGrid>
          {features.map((feature, index) => (
            <FeatureCard key={index}>
              <FeatureIcon>{feature.icon}</FeatureIcon>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </FeaturesSection>

      {/* Footer */}
      <Footer>
        <FooterText>© 2024 Samaanai. Built with purpose.</FooterText>
      </Footer>
    </PageContainer>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(10px, -10px) rotate(5deg); }
  50% { transform: translate(-5px, 15px) rotate(-5deg); }
  75% { transform: translate(-15px, -5px) rotate(3deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: #0f0f1a;
  color: white;
  overflow-x: hidden;
  position: relative;
`;

const AnimatedBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
`;

const GradientOrb1 = styled.div`
  position: absolute;
  top: -20%;
  left: -10%;
  width: 60vw;
  height: 60vw;
  max-width: 800px;
  max-height: 800px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: ${float} 20s ease-in-out infinite;
`;

const GradientOrb2 = styled.div`
  position: absolute;
  bottom: -30%;
  right: -20%;
  width: 70vw;
  height: 70vw;
  max-width: 900px;
  max-height: 900px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%);
  border-radius: 50%;
  animation: ${float} 25s ease-in-out infinite reverse;
`;

const GradientOrb3 = styled.div`
  position: absolute;
  top: 40%;
  left: 50%;
  width: 40vw;
  height: 40vw;
  max-width: 500px;
  max-height: 500px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: ${pulse} 8s ease-in-out infinite;
`;

const HeroSection = styled.section`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
`;

const HeroContent = styled.div`
  text-align: center;
  max-width: 800px;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const LogoIcon = styled.span`
  font-size: 3rem;
  color: #6366f1;
  margin-right: 0.75rem;
`;

const LogoText = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const HeroTitle = styled.h2`
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: white;
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f59e0b 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const HeroSubtitle = styled.p`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CTAContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryCTA = styled.button`
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
  }
`;

const SecondaryCTA = styled.button`
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const AppsSection = styled.section`
  position: relative;
  z-index: 1;
  padding: 6rem 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 3rem;
`;

const AppsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
`;

const AppCard = styled.div`
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
    
    > div:first-child {
      opacity: 1;
    }
  }
`;

const AppCardGlow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top left, ${props => props.$color}20 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
`;

const AppCardContent = styled.div`
  position: relative;
  z-index: 1;
`;

const AppIconWrapper = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: ${props => props.$gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
`;

const AppName = styled.h4`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`;

const AppDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 1rem 0;
  line-height: 1.5;
`;

const AppArrow = styled.span`
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  
  ${AppCard}:hover & {
    color: white;
    transform: translateX(5px);
  }
`;

const FeaturesSection = styled.section`
  position: relative;
  z-index: 1;
  padding: 6rem 2rem;
  background: rgba(255, 255, 255, 0.02);
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const FeatureCard = styled.div`
  text-align: center;
  padding: 2rem;
`;

const FeatureIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
`;

const FeatureTitle = styled.h4`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const FeatureDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
`;

const Footer = styled.footer`
  position: relative;
  z-index: 1;
  padding: 2rem;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const FooterText = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
`;

export default LandingPage;