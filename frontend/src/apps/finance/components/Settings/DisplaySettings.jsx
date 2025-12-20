import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  Divider
} from '@mui/material';
import styled from 'styled-components';

const DisplaySettings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    compactMode: false,
    showCents: true,
    chartAnimations: true,
    highContrast: false,
    fontSize: 14,
    dashboardLayout: 'grid',
    showAccountIcons: true
  });

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsContainer>
      <SettingsSection>
        <SectionTitle variant="h6">Theme & Appearance</SectionTitle>
        
        <SettingsGrid>
          <FormControl size="small">
            <InputLabel>Theme</InputLabel>
            <Select
              value={settings.theme}
              label="Theme"
              onChange={(e) => handleChange('theme', e.target.value)}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="auto">Auto (System)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Dashboard Layout</InputLabel>
            <Select
              value={settings.dashboardLayout}
              label="Dashboard Layout"
              onChange={(e) => handleChange('dashboardLayout', e.target.value)}
            >
              <MenuItem value="grid">Grid View</MenuItem>
              <MenuItem value="list">List View</MenuItem>
              <MenuItem value="compact">Compact View</MenuItem>
            </Select>
          </FormControl>
        </SettingsGrid>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.compactMode} onChange={(e) => handleChange('compactMode', e.target.checked)} />}
            label="Compact Mode"
          />
          <SwitchDescription>Show more information in less space</SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.highContrast} onChange={(e) => handleChange('highContrast', e.target.checked)} />}
            label="High Contrast Mode"
          />
          <SwitchDescription>Increase contrast for better visibility</SwitchDescription>
        </SwitchGroup>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      <SettingsSection>
        <SectionTitle variant="h6">Display Options</SectionTitle>
        
        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.showCents} onChange={(e) => handleChange('showCents', e.target.checked)} />}
            label="Show Cents"
          />
          <SwitchDescription>Display amounts with decimal places</SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.showAccountIcons} onChange={(e) => handleChange('showAccountIcons', e.target.checked)} />}
            label="Show Account Icons"
          />
          <SwitchDescription>Display icons next to account names</SwitchDescription>
        </SwitchGroup>

        <SwitchGroup>
          <FormControlLabel
            control={<Switch checked={settings.chartAnimations} onChange={(e) => handleChange('chartAnimations', e.target.checked)} />}
            label="Chart Animations"
          />
          <SwitchDescription>Enable animated transitions in charts and graphs</SwitchDescription>
        </SwitchGroup>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            Font Size: {settings.fontSize}px
          </Typography>
          <Slider
            value={settings.fontSize}
            onChange={(e, value) => handleChange('fontSize', value)}
            min={12}
            max={18}
            marks={[
              { value: 12, label: 'Small' },
              { value: 14, label: 'Medium' },
              { value: 16, label: 'Large' },
              { value: 18, label: 'X-Large' }
            ]}
            sx={{ maxWidth: 400 }}
          />
        </Box>
      </SettingsSection>

      <Divider sx={{ my: 4 }} />

      <SettingsSection>
        <SectionTitle variant="h6">Preview</SectionTitle>
        
        <PreviewContainer>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sample Dashboard Card
          </Typography>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              backgroundColor: settings.theme === 'dark' ? '#1e293b' : '#fff',
              color: settings.theme === 'dark' ? '#fff' : '#1e293b',
              fontSize: `${settings.fontSize}px`
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontSize: 'inherit' }}>
              Checking Account
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, fontSize: `${settings.fontSize + 6}px` }}>
              $2,540{settings.showCents ? '.50' : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: `${settings.fontSize - 2}px` }}>
              Available Balance
            </Typography>
          </Paper>
        </PreviewContainer>
      </SettingsSection>

      <SaveButtonContainer>
        <Button variant="contained" size="large" sx={{ px: 4 }}>
          Save Display Settings
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

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

const PreviewContainer = styled.div`
  margin-bottom: 24px;
`;

const SaveButtonContainer = styled.div`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
`;

export default DisplaySettings; 