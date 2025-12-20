import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import { 
  Security as SecurityIcon,
  Smartphone as PhoneIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import styled from 'styled-components';

const SecuritySettings = () => {
  const [settings, setSettings] = useState({
    twoFactorEnabled: true,
    loginNotifications: true,
    sessionTimeout: true,
    dataEncryption: true
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const activeSessions = [
    { id: 1, device: 'Chrome on MacBook Pro', location: 'New York, NY', lastActive: '2024-01-15 10:30 AM', current: true },
    { id: 2, device: 'Safari on iPhone', location: 'New York, NY', lastActive: '2024-01-14 08:45 PM', current: false },
  ];

  return (
    <SettingsContainer>
      <Alert severity="warning" sx={{ mb: 3 }}>
        Your security settings help protect your financial data. Changes to these settings may require additional verification.
      </Alert>

      <SettingsSection>
        <SectionTitle variant="h6">Password Security</SectionTitle>
        
        <PasswordForm>
          <TextField
            label="Current Password"
            type={showCurrentPassword ? "text" : "password"}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <Button size="small" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </Button>
              )
            }}
          />
          <TextField
            label="New Password"
            type={showNewPassword ? "text" : "password"}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <Button size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </Button>
              )
            }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            size="small"
            fullWidth
          />
          <Button variant="contained" size="small" sx={{ width: 'fit-content' }}>
            Update Password
          </Button>
        </PasswordForm>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      <SettingsSection>
        <SectionTitle variant="h6">Two-Factor Authentication</SectionTitle>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ color: settings.twoFactorEnabled ? '#059669' : '#6b7280' }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Two-Factor Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'} - Additional security for your account
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={settings.twoFactorEnabled ? "Enabled" : "Disabled"} 
            color={settings.twoFactorEnabled ? "success" : "default"}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" size="small" startIcon={<PhoneIcon />}>
            Setup Authenticator App
          </Button>
          <Button variant="outlined" size="small" startIcon={<KeyIcon />}>
            Backup Codes
          </Button>
        </Box>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      <SettingsSection>
        <SectionTitle variant="h6">Privacy & Security Preferences</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.loginNotifications} onChange={(e) => setSettings({...settings, loginNotifications: e.target.checked})} />}
            label="Login Notifications"
          />
          <SwitchDescription>Get notified when someone logs into your account</SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.sessionTimeout} onChange={(e) => setSettings({...settings, sessionTimeout: e.target.checked})} />}
            label="Automatic Session Timeout"
          />
          <SwitchDescription>Automatically log out after 30 minutes of inactivity</SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.dataEncryption} onChange={(e) => setSettings({...settings, dataEncryption: e.target.checked})} />}
            label="Enhanced Data Encryption"
          />
          <SwitchDescription>Use additional encryption for sensitive financial data</SwitchDescription>
        </SwitchGroup>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      <SettingsSection>
        <SectionTitle variant="h6">Active Sessions</SectionTitle>
        
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
          <List>
            {activeSessions.map((session, index) => (
              <React.Fragment key={session.id}>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon sx={{ color: session.current ? '#059669' : '#6b7280' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {session.device}
                        </Typography>
                        {session.current && (
                          <Chip label="Current Session" size="small" color="success" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {session.location}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last active: {session.lastActive}
                        </Typography>
                      </Box>
                    }
                  />
                  {!session.current && (
                    <Button size="small" color="error">
                      Revoke
                    </Button>
                  )}
                </ListItem>
                {index < activeSessions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </SettingsSection>

      <SaveButtonContainer>
        <Button variant="contained" size="large" sx={{ px: 4 }}>
          Save Security Settings
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
  margin-bottom: 24px !important;
`;

const PasswordForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
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
`;

export default SecuritySettings; 