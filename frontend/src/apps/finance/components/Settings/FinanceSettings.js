import React, { useState } from 'react';
import styled from 'styled-components';
import { Box, Typography, Paper } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import CategoryIcon from '@mui/icons-material/Category';
import RuleIcon from '@mui/icons-material/Rule';
import RepeatIcon from '@mui/icons-material/Repeat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import PaletteIcon from '@mui/icons-material/Palette';
import GeneralSettings from './GeneralSettings';
import AccountSettings from './AccountSettings';
import CategorySettings from './CategorySettings';
import RulesSettings from './RulesSettings';
import RecurringSettings from './RecurringSettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';
import BackupSettings from './BackupSettings';
import DisplaySettings from './DisplaySettings';

const settingsCategories = [
  { 
    key: 'general', 
    label: 'General', 
    icon: <PersonIcon />,
    description: 'Basic preferences and general settings'
  },
  { 
    key: 'account', 
    label: 'Account', 
    icon: <AccountBoxIcon />,
    description: 'Connected accounts and institution settings'
  },
  { 
    key: 'categories', 
    label: 'Categories', 
    icon: <CategoryIcon />,
    description: 'Manage transaction categories and budgets'
  },
  { 
    key: 'rules', 
    label: 'Rules', 
    icon: <RuleIcon />,
    description: 'Automatic categorization and transaction rules'
  },
  { 
    key: 'recurring', 
    label: 'Recurring', 
    icon: <RepeatIcon />,
    description: 'Recurring transactions and subscriptions'
  },
  { 
    key: 'notifications', 
    label: 'Notifications', 
    icon: <NotificationsIcon />,
    description: 'Email and alert preferences'
  },
  { 
    key: 'security', 
    label: 'Security', 
    icon: <SecurityIcon />,
    description: 'Password, authentication, and privacy settings'
  },
  { 
    key: 'backup', 
    label: 'Backup & Export', 
    icon: <BackupIcon />,
    description: 'Data backup and export options'
  },
  { 
    key: 'display', 
    label: 'Display', 
    icon: <PaletteIcon />,
    description: 'Theme, layout, and display preferences'
  },
];

const FinanceSettings = ({ accounts, loading, onRefreshAccounts }) => {
  const [activeCategory, setActiveCategory] = useState('general');

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case 'general':
        return <GeneralSettings />;
      case 'account':
        return <AccountSettings accounts={accounts} loading={loading} onRefreshAccounts={onRefreshAccounts} />;
      case 'categories':
        return <CategorySettings />;
      case 'rules':
        return <RulesSettings />;
      case 'recurring':
        return <RecurringSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'backup':
        return <BackupSettings />;
      case 'display':
        return <DisplaySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  const activeItem = settingsCategories.find(cat => cat.key === activeCategory);

  return (
    <SettingsContainer>
      <SettingsSidebar>
        <SidebarHeader>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Settings
          </Typography>
        </SidebarHeader>
        
        <CategoriesList>
          {settingsCategories.map((category) => (
            <CategoryItem 
              key={category.key}
              isActive={activeCategory === category.key}
              onClick={() => setActiveCategory(category.key)}
            >
              <CategoryIconWrapper>{category.icon}</CategoryIconWrapper>
              <CategoryContent>
                <CategoryLabel>{category.label}</CategoryLabel>
                <CategoryDescription>{category.description}</CategoryDescription>
              </CategoryContent>
            </CategoryItem>
          ))}
        </CategoriesList>
      </SettingsSidebar>

      <SettingsContent>
        <ContentHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HeaderIcon>{activeItem?.icon}</HeaderIcon>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                {activeItem?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeItem?.description}
              </Typography>
            </Box>
          </Box>
        </ContentHeader>

        <Paper elevation={0} sx={{ 
          padding: 3, 
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 2
        }}>
          {renderSettingsContent()}
        </Paper>
      </SettingsContent>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
  min-height: calc(100vh - 80px);
  gap: 24px;
`;

const SettingsSidebar = styled.div`
  width: 320px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  height: fit-content;
  overflow: hidden;
`;

const SidebarHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
`;

const CategoriesList = styled.div`
  padding: 16px 0;
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 24px;
  cursor: pointer;
  background: ${props => props.isActive ? '#eff6ff' : 'transparent'};
  border-left: ${props => props.isActive ? '3px solid #2563eb' : '3px solid transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.isActive ? '#eff6ff' : '#f8fafc'};
  }
`;

const CategoryIconWrapper = styled.div`
  color: ${props => props.isActive ? '#2563eb' : '#6b7280'};
  margin-top: 2px;
  
  svg {
    font-size: 1.25rem;
  }
`;

const CategoryContent = styled.div`
  flex: 1;
`;

const CategoryLabel = styled.div`
  font-weight: 500;
  font-size: 0.95rem;
  color: #1e293b;
  margin-bottom: 4px;
`;

const CategoryDescription = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.4;
`;

const SettingsContent = styled.div`
  flex: 1;
  min-height: 0;
`;

const ContentHeader = styled.div`
  margin-bottom: 24px;
`;

const HeaderIcon = styled.div`
  background: #eff6ff;
  border-radius: 12px;
  padding: 12px;
  color: #2563eb;
  
  svg {
    font-size: 1.5rem;
  }
`;

export default FinanceSettings; 