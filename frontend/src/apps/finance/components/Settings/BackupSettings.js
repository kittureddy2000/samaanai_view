import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { 
  CloudDownload as ExportIcon,
  History as BackupIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import styled from 'styled-components';

const BackupSettings = () => {
  const backupHistory = [
    { id: 1, date: '2024-01-15', type: 'Full Backup', size: '2.4 MB', status: 'completed' },
    { id: 2, date: '2024-01-01', type: 'Monthly Export', size: '1.8 MB', status: 'completed' },
    { id: 3, date: '2023-12-15', type: 'Full Backup', size: '2.1 MB', status: 'completed' },
  ];

  return (
    <SettingsContainer>
      <Alert severity="info" sx={{ mb: 3 }}>
        Keep your financial data safe with regular backups and exports. All backups are encrypted and secure.
      </Alert>

      <SettingsSection>
        <SectionTitle variant="h6">Export Data</SectionTitle>
        
        <ExportGrid>
          <ExportCard>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Transaction Export
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Export all your transaction data in various formats
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                CSV
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                Excel
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                PDF
              </Button>
            </Box>
          </ExportCard>

          <ExportCard>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Account Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generate comprehensive account and balance reports
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                Monthly
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                Yearly
              </Button>
            </Box>
          </ExportCard>

          <ExportCard>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Tax Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Export tax-ready reports and summaries
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                2023 Tax Report
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                2024 YTD
              </Button>
            </Box>
          </ExportCard>

          <ExportCard>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Full Data Backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Complete backup of all your financial data
            </Typography>
            <Button variant="contained" size="small" startIcon={<BackupIcon />}>
              Create Backup
            </Button>
          </ExportCard>
        </ExportGrid>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle variant="h6">Backup History</SectionTitle>
        
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
          <List>
            {backupHistory.map((backup, index) => (
              <React.Fragment key={backup.id}>
                <ListItem>
                  <ListItemIcon>
                    <BackupIcon sx={{ color: '#059669' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {backup.type}
                        </Typography>
                        <Chip label={backup.status} size="small" color="success" variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Created: {backup.date}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Size: {backup.size}
                        </Typography>
                      </Box>
                    }
                  />
                  <Button size="small" startIcon={<DownloadIcon />}>
                    Download
                  </Button>
                </ListItem>
                {index < backupHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle variant="h6">Automatic Backups</SectionTitle>
        
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure automatic backup schedules for your data protection.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small">
              Enable Weekly Backups
            </Button>
            <Button variant="outlined" size="small">
              Monthly Export Schedule
            </Button>
            <Button variant="outlined" size="small">
              Cloud Storage Settings
            </Button>
          </Box>
        </Paper>
      </SettingsSection>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 1000px;
`;

const SettingsSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600 !important;
  color: #1e293b !important;
  margin-bottom: 24px !important;
`;

const ExportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const ExportCard = styled(Paper)`
  padding: 24px !important;
  border: 1px solid #e5e7eb !important;
  elevation: 0 !important;
`;

export default BackupSettings; 