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
  width: ${props => props.$isExpanded ? '200px' : '60px'};
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.02);
  transition: width 0.3s ease;
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
  color: ${props => props.$isActive ? '#1976d2' : '#555'};
  background: ${props => props.$isActive ? '#e3f2fd' : 'transparent'};
  padding: 12px 16px;
  margin: 0 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  border-left: ${props => props.$isActive ? '3px solid #1976d2' : '3px solid transparent'};
  min-height: 48px;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: ${props => props.$isActive ? '#e3f2fd' : '#f0f4fa'};
    color: #1976d2;
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