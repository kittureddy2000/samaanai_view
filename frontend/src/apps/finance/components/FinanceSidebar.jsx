import React, { useState } from 'react';
import styled from 'styled-components';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, key: 'dashboard' },
  { label: 'Accounts', icon: <AccountBalanceIcon />, key: 'accounts' },
  { label: 'Settings', icon: <SettingsIcon />, key: 'settings' },
];

const FinanceSidebar = ({ currentView, onViewChange, showAccountsSidebar, onToggleAccountsSidebar }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <SidebarRoot
      $isExpanded={isExpanded}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <NavList>
        {navItems.map(item => (
          <NavItem
            key={item.key}
            $isActive={currentView === item.key}
            $isExpanded={isExpanded}
            onClick={() => onViewChange(item.key)}
          >
            <NavIcon>{item.icon}</NavIcon>
            <NavLabel $isExpanded={isExpanded} $isActive={currentView === item.key}>
              {item.label}
            </NavLabel>
          </NavItem>
        ))}

        {!showAccountsSidebar && (
          <NavItem
            $isActive={false}
            $isExpanded={isExpanded}
            onClick={onToggleAccountsSidebar}
            style={{ marginTop: '16px' }}
          >
            <NavIcon><AccountBalanceIcon /></NavIcon>
            <NavLabel $isExpanded={isExpanded} $isActive={false}>
              Show Accounts
            </NavLabel>
          </NavItem>
        )}
      </NavList>
    </SidebarRoot>
  );
};

const SidebarRoot = styled.div`
  width: ${props => props.$isExpanded ? '200px' : '64px'};
  background: #1a1a2e;
  border-right: 1px solid rgba(99, 102, 241, 0.15);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.5rem 0;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  z-index: 100;
`;

const NavList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 16px;
`;

const NavItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  color: ${props => props.$isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.5)'};
  background: ${props => props.$isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
  padding: 12px 16px;
  margin: 0 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  border-left: 3px solid ${props => props.$isActive ? '#6366f1' : 'transparent'};
  min-height: 48px;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: ${props => props.$isActive ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$isActive ? '#a5b4fc' : 'rgba(255, 255, 255, 0.8)'};
  }
`;

const NavIcon = styled.div`
  font-size: 1.6rem;
  margin-right: 12px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NavLabel = styled.div`
  font-size: 1rem;
  font-weight: ${props => props.$isActive ? '600' : '400'};
  white-space: nowrap;
  opacity: ${props => props.$isExpanded ? 1 : 0};
  transform: translateX(${props => props.$isExpanded ? '0' : '-10px'});
  transition: all 0.3s ease;
  overflow: hidden;
`;

export default FinanceSidebar; 