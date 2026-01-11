import React, { useState, useEffect } from 'react';
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
  MenuItem,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Repeat as RepeatIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Warning as DueSoonIcon,
  AutoAwesome as AutoIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import api from '../../services/api';

const SettingsContainer = styled.div`
  max-width: 1200px;
`;

const SummaryCard = styled(Card)`
  background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
  color: white;
`;

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'yearly', label: 'Yearly' },
];

const RecurringSettings = () => {
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category: '',
    is_income: false,
    start_date: new Date().toISOString().slice(0, 10),
    next_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load recurring transactions
      const recurringRes = await api.get('/api/finance/recurring-transactions/');
      const recurringData = recurringRes.data.results || recurringRes.data;
      setRecurring(Array.isArray(recurringData) ? recurringData : []);

      // Load summary
      const summaryRes = await api.get('/api/finance/recurring-transactions/summary/');
      setSummary(summaryRes.data);

      // Load categories for dropdown
      const categoriesRes = await api.get('/api/finance/spending-categories/?parent_only=true');
      const catData = categoriesRes.data.results || categoriesRes.data;
      setCategories(Array.isArray(catData) ? catData : []);

    } catch (err) {
      console.error('Error loading recurring transactions:', err);
      setError('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        amount: item.amount,
        frequency: item.frequency,
        category: item.category || '',
        is_income: item.is_income,
        start_date: item.start_date,
        next_date: item.next_date,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        category: '',
        is_income: false,
        start_date: new Date().toISOString().slice(0, 10),
        next_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        category: formData.category || null
      };

      if (editingItem) {
        await api.patch(`/api/finance/recurring-transactions/${editingItem.id}/`, data);
        setSuccess('Recurring transaction updated successfully');
      } else {
        await api.post('/api/finance/recurring-transactions/', data);
        setSuccess('Recurring transaction created successfully');
      }

      handleCloseDialog();
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving recurring transaction:', err);
      setError('Failed to save recurring transaction');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
      try {
        await api.delete(`/api/finance/recurring-transactions/${id}/`);
        setSuccess('Recurring transaction deleted');
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error deleting recurring transaction:', err);
        setError('Failed to delete recurring transaction');
      }
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.patch(`/api/finance/recurring-transactions/${item.id}/`, {
        is_active: !item.is_active
      });
      loadData();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleDetectPatterns = async () => {
    try {
      setDetecting(true);
      setError(null);
      const response = await api.post('/api/finance/recurring-transactions/detect_patterns/', {
        auto_create: true
      });
      const { created_count, patterns_detected } = response.data;
      setSuccess(`Detected ${patterns_detected} recurring patterns. Created ${created_count} new entries.`);
      loadData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error detecting patterns:', err);
      setError('Failed to detect recurring transactions');
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <SettingsContainer>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <SummaryCard>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Monthly Expenses</Typography>
                <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 600 }}>
                  ${summary.monthly_expenses?.toLocaleString()}
                </Typography>
              </CardContent>
            </SummaryCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SummaryCard>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Monthly Income</Typography>
                <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 600 }}>
                  ${summary.monthly_income?.toLocaleString()}
                </Typography>
              </CardContent>
            </SummaryCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SummaryCard>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Due Soon</Typography>
                <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 600 }}>
                  {summary.upcoming_count} items
                </Typography>
              </CardContent>
            </SummaryCard>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Recurring Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your recurring transactions and subscriptions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={detecting ? <CircularProgress size={16} /> : <AutoIcon />}
            onClick={handleDetectPatterns}
            disabled={detecting}
          >
            {detecting ? 'Detecting...' : 'Detect Recurring'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Recurring
          </Button>
        </Box>
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
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recurring.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No recurring transactions yet. Click "Add Recurring" to create one.
                </TableCell>
              </TableRow>
            ) : (
              recurring.map((item) => (
                <TableRow key={item.id} hover sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.is_income ? (
                        <IncomeIcon sx={{ color: '#22c55e', fontSize: '1rem' }} />
                      ) : (
                        <ExpenseIcon sx={{ color: '#ef4444', fontSize: '1rem' }} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      {item.is_due_soon && (
                        <Tooltip title="Due within 7 days">
                          <DueSoonIcon sx={{ color: '#f59e0b', fontSize: '1rem' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: item.is_income ? '#22c55e' : '#ef4444' }}
                    >
                      {item.is_income ? '+' : '-'}${parseFloat(item.amount).toLocaleString()}
                    </Typography>
                    {item.frequency !== 'monthly' && (
                      <Typography variant="caption" color="text.secondary">
                        (~${item.monthly_amount?.toLocaleString()}/mo)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.frequency_display}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {item.category_name ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.category_icon && <span>{item.category_icon}</span>}
                        <Typography variant="body2">{item.category_name}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Uncategorized</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(item.next_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onChange={() => handleToggleActive(item)}
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          sx={{ color: '#3b82f6' }}
                          onClick={() => handleOpenDialog(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          sx={{ color: '#dc2626' }}
                          onClick={() => handleDelete(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Name / Description"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Netflix, Rent, Gym Membership"
            />

            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_income}
                  onChange={(e) => setFormData({ ...formData, is_income: e.target.checked })}
                  color="success"
                />
              }
              label={formData.is_income ? "This is income" : "This is an expense"}
            />

            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                label="Frequency"
              >
                {frequencyOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.icon && <span style={{ marginRight: 8 }}>{cat.icon}</span>}
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Next Due Date"
              type="date"
              value={formData.next_date}
              onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Optional notes..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name.trim() || !formData.amount}
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsContainer>
  );
};

export default RecurringSettings;