import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Repeat as RepeatIcon
} from '@mui/icons-material';
import styled from 'styled-components';

const RecurringSettings = () => {
  const [recurring, setRecurring] = useState([
    { id: 1, name: 'Netflix', amount: 15.99, frequency: 'Monthly', category: 'Entertainment', nextDate: '2024-02-01' },
    { id: 2, name: 'Spotify', amount: 9.99, frequency: 'Monthly', category: 'Entertainment', nextDate: '2024-02-05' },
    { id: 3, name: 'Rent', amount: 1200, frequency: 'Monthly', category: 'Housing', nextDate: '2024-02-01' },
    { id: 4, name: 'Car Insurance', amount: 89.50, frequency: 'Monthly', category: 'Transportation', nextDate: '2024-02-15' },
  ]);

  return (
    <SettingsContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Recurring Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your recurring transactions and subscriptions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Recurring
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Frequency</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Next Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recurring.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RepeatIcon sx={{ color: '#6b7280', fontSize: '1rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#dc2626' }}>
                    ${item.amount}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={item.frequency} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{item.category}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.nextDate}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small" sx={{ color: '#3b82f6' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#dc2626' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 1000px;
`;

export default RecurringSettings; 