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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Rule as RuleIcon
} from '@mui/icons-material';
import styled from 'styled-components';

const RulesSettings = () => {
  const [rules, setRules] = useState([
    { 
      id: 1, 
      name: 'Coffee Shop Auto-Category', 
      condition: 'merchant_contains', 
      value: 'Starbucks',
      action: 'set_category',
      category: 'Coffee Shops',
      active: true
    },
    { 
      id: 2, 
      name: 'Salary Auto-Category', 
      condition: 'amount_greater_than', 
      value: '3000',
      action: 'set_category',
      category: 'Salary',
      active: true
    },
    { 
      id: 3, 
      name: 'Grocery Store Rule', 
      condition: 'merchant_contains', 
      value: 'Whole Foods',
      action: 'set_category',
      category: 'Groceries',
      active: false
    }
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({
    name: '',
    condition: 'merchant_contains',
    value: '',
    action: 'set_category',
    category: ''
  });

  return (
    <SettingsContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Transaction Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up automatic categorization rules for your transactions
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Rule
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600 }}>Rule Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Condition</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {rule.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {rule.condition.replace('_', ' ')} "{rule.value}"
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Set category to "{rule.category}"
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={rule.active ? "Active" : "Inactive"} 
                    size="small" 
                    color={rule.active ? "success" : "default"}
                  />
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

export default RulesSettings; 