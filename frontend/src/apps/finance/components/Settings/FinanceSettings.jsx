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
import AssessmentIcon from '@mui/icons-material/Assessment';
import GeneralSettings from './GeneralSettings';
import AccountSettings from './AccountSettings';
import CategorySettings from './CategorySettings';
import RulesSettings from './RulesSettings';
import RecurringSettings from './RecurringSettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';
import BackupSettings from './BackupSettings';
import DisplaySettings from './DisplaySettings';
import ReportsSettings from './ReportsSettings';
import ImportSettings from './ImportSettings';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const settingsCategories = [
  {
    key: 'general',
    label: 'General',
    icon: <PersonIcon />,
    description: 'Basic preferences and general settings'
  },
  {
    key: 'account',
    label: 'Accounts',
    icon: <AccountBoxIcon />,
    description: 'Connected accounts and institution settings'
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <AssessmentIcon />,
    description: 'Financial reports and analytics'
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
  {
    key: 'import',
    label: 'Import Data',
    icon: <CloudUploadIcon />,
    description: 'Import CSV from Fidelity and other sources'
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
      case 'reports':
        return <ReportsSettings accounts={accounts} />;
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
      case 'import':
        return <ImportSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  const activeItem = settingsCategories.find(cat => cat.key === activeCategory);

  return (
    <SettingsContainer>
      <SettingsSidebar>
        <SidebarHeader>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
            Settings
          </Typography>
        </SidebarHeader>

        <CategoriesList>
          {settingsCategories.map((category) => (
            <CategoryItem
              key={category.key}
              $isActive={activeCategory === category.key}
              onClick={() => setActiveCategory(category.key)}
            >
              <CategoryIconWrapper $isActive={activeCategory === category.key}>
                {category.icon}
              </CategoryIconWrapper>
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
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                {activeItem?.label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {activeItem?.description}
              </Typography>
            </Box>
          </Box>
        </ContentHeader>

        <ContentPanel>
          {renderSettingsContent()}
        </ContentPanel>
      </SettingsContent>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
  width: 100%;
  height: calc(100vh - 120px);
  gap: 24px;
  overflow: hidden;
`;

const SettingsSidebar = styled.div`
  width: 300px;
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  max-height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(26, 26, 46, 0.5);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.4);
    border-radius: 3px;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.1);
`;

const CategoriesList = styled.div`
  padding: 12px 0;
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  background: ${props => props.$isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
  border-left: ${props => props.$isActive ? '3px solid #6366f1' : '3px solid transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.05)'};
  }
`;

const CategoryIconWrapper = styled.div`
  color: ${props => props.$isActive ? '#818cf8' : 'rgba(255,255,255,0.5)'};
  margin-top: 2px;
  
  svg {
    font-size: 1.2rem;
  }
`;

const CategoryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CategoryLabel = styled.div`
  font-weight: 500;
  font-size: 0.9rem;
  color: #fff;
  margin-bottom: 3px;
`;

const CategoryDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  line-height: 1.3;
`;

const SettingsContent = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(26, 26, 46, 0.5);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.4);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.6);
  }
`;

const ContentHeader = styled.div`
  margin-bottom: 20px;
`;

const HeaderIcon = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  padding: 12px;
  color: #fff;
  
  svg {
    font-size: 1.5rem;
  }
`;

const ContentPanel = styled.div`
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 24px;
  min-height: 400px;
`;

export default FinanceSettings;