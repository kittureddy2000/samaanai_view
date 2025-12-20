import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel,
  Button,
  Paper,
  Divider,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import styled from 'styled-components';
import api from '../../services/api';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    email_notifications: true,
    budget_alerts: true,
    low_balance_alerts: true,
    new_transaction_alerts: false,
    weekly_reports: true,
    monthly_reports: true,
    security_alerts: true,
    marketing_emails: false,
    low_balance_threshold: 100,
    budget_threshold: 90
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  // Load notification preferences on component mount
  useEffect(() => {
    loadNotificationPreferences();
    checkEmailStatus();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/preferences/');
      setSettings(response.data);
      setError('');
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      const response = await api.get('/api/notifications/status/');
      setEmailStatus(response.data);
    } catch (error) {
      console.error('Error checking email status:', error);
    }
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    setSaved(false);
  };

  const handleThresholdChange = (setting, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettings(prev => ({
        ...prev,
        [setting]: numValue
      }));
      setSaved(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await api.post('/api/notifications/preferences/', settings);
      
      if (response.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(response.data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setError(error.response?.data?.error || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      const response = await api.post('/api/notifications/test/');
      
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert(`❌ Failed to send test notification: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <SettingsContainer>
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Notification settings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        Manage your notification preferences and alert settings.
        <Button size="small" onClick={testNotification} sx={{ ml: 2 }}>
          Test Notification
        </Button>
      </Alert>

      {emailStatus && !emailStatus.configuration_complete && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Email Integration Required:</strong> To send actual emails, you need to configure SendGrid API keys in the backend. 
          Currently, notifications are saved as preferences only.
        </Alert>
      )}

      <SettingsSection>
        <SectionTitle variant="h6">Email Notifications</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.email_notifications} 
                onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
              />
            }
            label="Enable Email Notifications"
          />
          <Typography variant="body2" color="text.secondary">
            Master switch for all email notifications
          </Typography>
        </SwitchGroup>

        <Divider sx={{ my: 3 }} />

        <SectionTitle variant="h6">Alert Types</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.budget_alerts} 
                onChange={(e) => handleSettingChange('budget_alerts', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Budget Alerts"
          />
          <Typography variant="body2" color="text.secondary">
            Get notified when you approach or exceed budget limits
          </Typography>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.low_balance_alerts} 
                onChange={(e) => handleSettingChange('low_balance_alerts', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Low Balance Alerts"
          />
          <Typography variant="body2" color="text.secondary">
            Get notified when account balances fall below threshold
          </Typography>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.new_transaction_alerts} 
                onChange={(e) => handleSettingChange('new_transaction_alerts', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="New Transaction Alerts"
          />
          <Typography variant="body2" color="text.secondary">
            Get notified about new transactions (can be frequent)
          </Typography>
        </SwitchGroup>

        <Divider sx={{ my: 3 }} />

        <SectionTitle variant="h6">Reports</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.weekly_reports} 
                onChange={(e) => handleSettingChange('weekly_reports', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Weekly Reports"
          />
          <Typography variant="body2" color="text.secondary">
            Receive weekly financial summaries
          </Typography>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.monthly_reports} 
                onChange={(e) => handleSettingChange('monthly_reports', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Monthly Reports"
          />
          <Typography variant="body2" color="text.secondary">
            Receive monthly financial summaries
          </Typography>
        </SwitchGroup>

        <Divider sx={{ my: 3 }} />

        <SectionTitle variant="h6">Other Notifications</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.security_alerts} 
                onChange={(e) => handleSettingChange('security_alerts', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Security Alerts"
          />
          <Typography variant="body2" color="text.secondary">
            Important security and account notifications
          </Typography>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={
              <Switch 
                checked={settings.marketing_emails} 
                onChange={(e) => handleSettingChange('marketing_emails', e.target.checked)}
                disabled={!settings.email_notifications}
              />
            }
            label="Marketing Emails"
          />
          <Typography variant="body2" color="text.secondary">
            Product updates and promotional content
          </Typography>
        </SwitchGroup>

        <Divider sx={{ my: 3 }} />

        <SectionTitle variant="h6">Alert Thresholds</SectionTitle>
        
        <ThresholdGroup>
          <TextField
            label="Budget Alert Threshold (%)"
            type="number"
            value={settings.budget_threshold}
            onChange={(e) => handleThresholdChange('budget_threshold', e.target.value)}
            inputProps={{ min: 50, max: 100 }}
            helperText="Percentage of budget to trigger alert (50-100%)"
            disabled={!settings.email_notifications || !settings.budget_alerts}
          />
        </ThresholdGroup>

        <ThresholdGroup>
          <TextField
            label="Low Balance Threshold ($)"
            type="number"
            value={settings.low_balance_threshold}
            onChange={(e) => handleThresholdChange('low_balance_threshold', e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="Dollar amount to trigger low balance alert"
            disabled={!settings.email_notifications || !settings.low_balance_alerts}
          />
        </ThresholdGroup>
      </SettingsSection>

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={saveSettings}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={loadNotificationPreferences}
          disabled={loading}
        >
          Reset
        </Button>
      </Box>
    </SettingsContainer>
  );
};

// Styled components
const SettingsContainer = styled(Box)`
  padding: 24px;
  max-width: 800px;
`;

const SettingsSection = styled(Paper)`
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: none;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
`;

const SwitchGroup = styled(Box)`
  margin-bottom: 16px;
  
  .MuiFormControlLabel-root {
    align-items: flex-start;
    margin-bottom: 4px;
  }
  
  .MuiSwitch-root {
    margin-top: -4px;
  }
`;

const ThresholdGroup = styled(Box)`
  margin-bottom: 16px;
  
  .MuiTextField-root {
    max-width: 300px;
  }
`;

export default NotificationSettings; 
