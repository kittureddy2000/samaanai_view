import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../../apps/calorie-tracker/contexts/AuthContext';
import { Container } from '../UI';

// Navigation items
const navItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Daily Entry', path: '/daily', icon: 'calendar_today' },
  { name: 'Weight Tracking', path: '/weight', icon: 'monitor_weight' },
  { name: 'Weekly Report', path: '/weekly', icon: 'calendar_view_week' },
  { name: 'Monthly Report', path: '/monthly', icon: 'calendar_view_month' },
  { name: 'Yearly Report', path: '/yearly', icon: 'date_range' },
  { name: 'Profile', path: '/profile', icon: 'person' },
];

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <LayoutWrapper>
      <Header>
        <Container>
          <HeaderContent>
            <Logo>
              <span className="material-symbols-outlined">monitoring</span>
              <h1>CalorieTracker</h1>
            </Logo>
            
            <MobileMenuToggle onClick={toggleMobileMenu}>
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </MobileMenuToggle>
            
            <HeaderActions>
              <UserInfo>
                <span className="material-symbols-outlined">account_circle</span>
                <span>{currentUser?.username}</span>
              </UserInfo>
              
              <LogoutButton onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
              </LogoutButton>
            </HeaderActions>
          </HeaderContent>
        </Container>
      </Header>
      
      <MainSection>
        <SideNav open={mobileMenuOpen}>
          <NavItems>
            {navItems.map((item) => (
              <NavItem key={item.path}>
                <StyledNavLink 
                  to={item.path} 
                  onClick={() => setMobileMenuOpen(false)}
                  end={item.path === '/'}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.name}</span>
                </StyledNavLink>
              </NavItem>
            ))}
          </NavItems>
        </SideNav>
        
        <ContentArea>
          <Container>
            <Outlet />
          </Container>
        </ContentArea>
      </MainSection>
    </LayoutWrapper>
  );
};

// Styled components
const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.medium};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-weight: 500;
  
  span {
    font-size: 24px;
    margin-right: 0.5rem;
  }
  
  h1 {
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      display: none;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1rem;
  
  span:first-child {
    margin-right: 0.5rem;
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.8;
  }
  
  span:first-child {
    margin-right: 0.5rem;
  }
`;

const MobileMenuToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: block;
  }
`;

const MainSection = styled.div`
  display: flex;
  flex: 1;
  margin-top: 60px; /* Header height */
`;

const SideNav = styled.nav`
  width: 240px;
  background-color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.small};
  flex-shrink: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    position: fixed;
    top: 60px;
    left: 0;
    bottom: 0;
    z-index: 900;
    transform: translateX(${({ open }) => (open ? '0' : '-100%')});
    transition: transform 0.3s ease;
  }
`;

const NavItems = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;
`;

const NavItem = styled.li`
  margin-bottom: 0.25rem;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: ${({ theme }) => theme.colors.dark};
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
  
  span:first-child {
    margin-right: 0.75rem;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  &.active {
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.primary + '10'};
    font-weight: 500;
    border-right: 3px solid ${({ theme }) => theme.colors.primary};
  }
`;

const ContentArea = styled.main`
  flex: 1;
  padding: 2rem 0;
  background-color: ${({ theme }) => theme.colors.light};
  min-height: calc(100vh - 60px);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1.5rem 0;
  }
`;

export default Layout;