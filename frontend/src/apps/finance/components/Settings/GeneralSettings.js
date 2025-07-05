import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Switch, 
  FormControlLabel,
  Button,
  Divider,
  Alert
} from '@mui/material';
import styled from 'styled-components';

const GeneralSettings = () => {
  const [settings, setSettings] = useState({
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
    language: 'en',
    fiscalYearStart: 'January',
    enableNotifications: true,
    autoSync: true,
    defaultDashboardView: 'dashboard',
    transactionsPerPage: 15,
    enableBudgetAlerts: true,
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('financeAppGeneralSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prevSettings => ({ ...prevSettings, ...parsedSettings }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('financeAppGeneralSettings', JSON.stringify(settings));
      
      // Apply settings to the application
      applySettings(settings);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Apply settings to the application
  const applySettings = (newSettings) => {
    // Apply currency format globally
    if (window.financeApp) {
      window.financeApp.currency = newSettings.defaultCurrency;
      window.financeApp.dateFormat = newSettings.dateFormat;
      window.financeApp.transactionsPerPage = newSettings.transactionsPerPage;
    } else {
      // Create global settings object if it doesn't exist
      window.financeApp = {
        currency: newSettings.defaultCurrency,
        dateFormat: newSettings.dateFormat,
        transactionsPerPage: newSettings.transactionsPerPage,
        fiscalYearStart: newSettings.fiscalYearStart,
        enableBudgetAlerts: newSettings.enableBudgetAlerts
      };
    }

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('financeSettingsChanged', {
      detail: newSettings
    }));
  };

  if (loading) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <SettingsContainer>
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* User Preferences */}
      <SettingsSection>
        <SectionTitle variant="h6">User Preferences</SectionTitle>
        <SectionDescription>
          Configure your basic preferences and default settings
        </SectionDescription>

        <SettingsGrid>
          <FormControl size="small">
            <InputLabel>Default Currency</InputLabel>
            <Select
              value={settings.defaultCurrency}
              label="Default Currency"
              onChange={(e) => handleChange('defaultCurrency', e.target.value)}
            >
              <MenuItem value="USD">US Dollar (USD)</MenuItem>
              <MenuItem value="EUR">Euro (EUR)</MenuItem>
              <MenuItem value="GBP">British Pound (GBP)</MenuItem>
              <MenuItem value="CAD">Canadian Dollar (CAD)</MenuItem>
              <MenuItem value="AUD">Australian Dollar (AUD)</MenuItem>
              <MenuItem value="JPY">Japanese Yen (JPY)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Date Format</InputLabel>
            <Select
              value={settings.dateFormat}
              label="Date Format"
              onChange={(e) => handleChange('dateFormat', e.target.value)}
            >
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (US)</MenuItem>
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (International)</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
              <MenuItem value="DD MMM YYYY">DD MMM YYYY</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Timezone</InputLabel>
            <Select
              value={settings.timezone}
              label="Timezone"
              onChange={(e) => handleChange('timezone', e.target.value)}
            >
              <MenuItem value="America/New_York">Eastern Time</MenuItem>
              <MenuItem value="America/Chicago">Central Time</MenuItem>
              <MenuItem value="America/Denver">Mountain Time</MenuItem>
              <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
              <MenuItem value="UTC">UTC</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Language</InputLabel>
            <Select
              value={settings.language}
              label="Language"
              onChange={(e) => handleChange('language', e.target.value)}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
              <MenuItem value="de">German</MenuItem>
              <MenuItem value="it">Italian</MenuItem>
            </Select>
          </FormControl>
        </SettingsGrid>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      {/* Financial Settings */}
      <SettingsSection>
        <SectionTitle variant="h6">Financial Settings</SectionTitle>
        <SectionDescription>
          Configure financial year and budgeting preferences
        </SectionDescription>

        <SettingsGrid>
          <FormControl size="small">
            <InputLabel>Fiscal Year Start</InputLabel>
            <Select
              value={settings.fiscalYearStart}
              label="Fiscal Year Start"
              onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
            >
              <MenuItem value="January">January</MenuItem>
              <MenuItem value="February">February</MenuItem>
              <MenuItem value="March">March</MenuItem>
              <MenuItem value="April">April</MenuItem>
              <MenuItem value="May">May</MenuItem>
              <MenuItem value="June">June</MenuItem>
              <MenuItem value="July">July</MenuItem>
              <MenuItem value="August">August</MenuItem>
              <MenuItem value="September">September</MenuItem>
              <MenuItem value="October">October</MenuItem>
              <MenuItem value="November">November</MenuItem>
              <MenuItem value="December">December</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Transactions Per Page"
            type="number"
            size="small"
            value={settings.transactionsPerPage}
            onChange={(e) => handleChange('transactionsPerPage', parseInt(e.target.value))}
            InputProps={{ inputProps: { min: 5, max: 100 } }}
          />
        </SettingsGrid>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableBudgetAlerts}
                onChange={(e) => handleChange('enableBudgetAlerts', e.target.checked)}
              />
            }
            label="Enable Budget Alerts"
          />
          <SwitchDescription>
            Get notified when you exceed budget limits or approach spending thresholds
          </SwitchDescription>
        </SwitchGroup>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      {/* Application Settings */}
      <SettingsSection>
        <SectionTitle variant="h6">Application Settings</SectionTitle>
        <SectionDescription>
          General application behavior and sync preferences
        </SectionDescription>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableNotifications}
                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />
          <SwitchDescription>
            Receive system notifications for important account activities
          </SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSync}
                onChange={(e) => handleChange('autoSync', e.target.checked)}
              />
            }
            label="Auto-Sync Data"
          />
          <SwitchDescription>
            Automatically sync account data in the background every hour
          </SwitchDescription>
        </SwitchGroup>

        <SettingsGrid>
          <FormControl size="small">
            <InputLabel>Default Dashboard View</InputLabel>
            <Select
              value={settings.defaultDashboardView}
              label="Default Dashboard View"
              onChange={(e) => handleChange('defaultDashboardView', e.target.value)}
            >
              <MenuItem value="dashboard">Dashboard Overview</MenuItem>
              <MenuItem value="accounts">Accounts List</MenuItem>
              <MenuItem value="transactions">Recent Transactions</MenuItem>
            </Select>
          </FormControl>
        </SettingsGrid>
      </SettingsSection>

      {/* Save Button */}
      <SaveButtonContainer>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleSave}
          sx={{ px: 4 }}
        >
          Save Changes
        </Button>
      </SaveButtonContainer>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 800px;
`;

const SettingsSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600 !important;
  color: #1e293b !important;
  margin-bottom: 8px !important;
`;

const SectionDescription = styled(Typography)`
  color: #6b7280 !important;
  margin-bottom: 24px !important;
  font-size: 0.875rem !important;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const SwitchGroup = styled.div`
  margin-bottom: 20px;
`;

const SwitchDescription = styled(Typography)`
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  margin-left: 44px !important;
  margin-top: 4px !important;
`;

const SaveButtonContainer = styled.div`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-start;
`;

export default GeneralSettings; 