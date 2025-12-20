import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../auth';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Header = () => {
  const { currentUser, logout, isAuthenticated, userDisplayName, loading } = useAuth();

  // Also check for tokens in localStorage for immediate feedback
  const hasTokens = !!localStorage.getItem('accessToken');
  const showProfile = isAuthenticated || (hasTokens && !loading);
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate('/login');
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(false);
    navigate('/profile');
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <HeaderLeft>
          <LogoSection>
            <LogoLink to="/">
              <LogoIcon className="material-symbols-outlined">monitoring</LogoIcon>
              <LogoText>Samaanai</LogoText>
            </LogoLink>
          </LogoSection>

          {showProfile && (
            <NavLinks>
              <NavLink to="/sp">
                <span className="material-symbols-outlined">show_chart</span>
                S&P
              </NavLink>
              <NavLink to="/finance">
                <span className="material-symbols-outlined">account_balance</span>
                Finance
              </NavLink>
            </NavLinks>
          )}
        </HeaderLeft>

        <HeaderRight>
          {showProfile ? (
            <ProfileSection ref={dropdownRef}>
              <ProfileButton onClick={toggleProfileDropdown}>
                <ProfileAvatar>
                  <PersonIcon sx={{ fontSize: '1.2rem', color: '#fff' }} />
                </ProfileAvatar>
                <ProfileName>{userDisplayName || 'Loading...'}</ProfileName>
                <DropdownArrow $isOpen={showProfileDropdown}>
                  <span className="material-symbols-outlined">keyboard_arrow_down</span>
                </DropdownArrow>
              </ProfileButton>

              {showProfileDropdown && (
                <ProfileDropdown>
                  <DropdownItem onClick={handleProfileClick}>
                    <SettingsIcon sx={{ fontSize: '1rem', mr: 1 }} />
                    Profile Settings
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem onClick={handleLogout}>
                    <LogoutIcon sx={{ fontSize: '1rem', mr: 1 }} />
                    Logout
                  </DropdownItem>
                </ProfileDropdown>
              )}
            </ProfileSection>
          ) : (
            <AuthButtons>
              <LoginButton to="/login">Sign In</LoginButton>
              <RegisterButton to="/register">Sign Up</RegisterButton>
            </AuthButtons>
          )}
        </HeaderRight>
      </HeaderContent>
    </HeaderContainer>
  );
};

// Styled Components
const HeaderContainer = styled.header`
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 64px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
`;

const HeaderContent = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
`;

const LogoIcon = styled.span`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-right: 0.5rem;
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  letter-spacing: -0.03em;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: ${({ theme }) => theme.transitions.default};
  
  span.material-symbols-outlined {
    margin-right: 0.5rem;
    font-size: 1.2rem;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
`;

const ProfileSection = styled.div`
  position: relative;
`;

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f3f4f6;
  }
`;

const ProfileAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ProfileName = styled.span`
  font-weight: 500;
  color: #374151;
  margin-right: 0.5rem;
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const DropdownArrow = styled.div`
  transition: transform 0.2s ease;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  
  span {
    font-size: 1.2rem;
    color: #6b7280;
  }
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  z-index: 1001;
`;

const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  text-align: left;
  cursor: pointer;
  color: #374151;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f3f4f6;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0;
`;

const AuthButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const LoginButton = styled(Link)`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: ${({ theme }) => theme.transitions.default};
  
  &:hover {
    background-color: ${({ theme }) => `${theme.colors.primary}10`};
  }
`;

const RegisterButton = styled(Link)`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.gradients.primary};
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: ${({ theme }) => theme.transitions.default};
  
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: translateY(-1px);
    opacity: 0.9;
  }
`;

export default Header;