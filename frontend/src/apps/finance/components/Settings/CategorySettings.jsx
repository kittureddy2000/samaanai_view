import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  IconButton,
  Paper,
  Divider,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  MonetizationOn as BudgetIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import api from '../../services/api';

const CategorySettings = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    monthly_budget: 0,
    color: '#3498db',
    icon: ''
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/finance/spending-categories/');
      const cats = response.data.results || response.data;
      setCategories(Array.isArray(cats) ? cats : []);
      setError('');
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await api.get('/finance/spending-categories/');
        const cats = response.data.results || response.data;
        setCategories(Array.isArray(cats) ? cats : []);
        setError('');
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setNewCategory({ name: '', monthly_budget: 0, color: '#3498db', icon: '' });
    setOpenDialog(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({ 
      name: category.name,
      monthly_budget: category.monthly_budget || 0,
      color: category.color || '#3498db',
      icon: category.icon || ''
    });
    setOpenDialog(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/finance/spending-categories/${categoryId}/`);
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        handleSave();
      } catch (error) {
        console.error('Error deleting category:', error);
        setError('Failed to delete category');
      }
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        // Update existing category
        const response = await api.patch(`/finance/spending-categories/${editingCategory.id}/`, newCategory);
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? response.data : cat
        ));
      } else {
        // Create new category
        const response = await api.post('/finance/spending-categories/', newCategory);
        setCategories(prev => [...prev, response.data]);
      }
      setOpenDialog(false);
      handleSave();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category');
    }
  };

  const predefinedColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', 
    '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
    '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e', '#6c5ce7'
  ];

  const expenseCategories = categories; // All categories can have budgets
  const totalExpenseBudget = categories.reduce((sum, cat) => sum + (parseFloat(cat.monthly_budget) || 0), 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <SettingsContainer>
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Category settings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Budget Summary */}
      <SummarySection>
        <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Budget Overview
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
              size="small"
            >
              Add Category
            </Button>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <BudgetCard>
              <Typography variant="body2" color="text.secondary">Total Monthly Budget</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#dc2626' }}>
                ${totalExpenseBudget.toLocaleString()}
              </Typography>
            </BudgetCard>
            <BudgetCard>
              <Typography variant="body2" color="text.secondary">Total Categories</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {categories.length}
              </Typography>
            </BudgetCard>
            <BudgetCard>
              <Typography variant="body2" color="text.secondary">With Budgets</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#059669' }}>
                {categories.filter(cat => cat.monthly_budget > 0).length}
              </Typography>
            </BudgetCard>
          </Box>
        </Paper>
      </SummarySection>

      {/* Categories */}
      <SettingsSection>
        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon sx={{ color: '#dc2626' }} />
            <SectionTitle variant="h6">Spending Categories</SectionTitle>
          </Box>
          <Chip 
            label={`${categories.length} categories`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </SectionHeader>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Monthly Budget</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current Spending</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseCategories.map((category) => (
                <TableRow key={category.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ColorDot color={category.color} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {category.name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {category.monthly_budget ? `$${category.monthly_budget?.toLocaleString()}` : 'No budget'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#059669' }}>
                      ${category.current_month_spending?.toLocaleString() || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditCategory(category)}
                        sx={{ color: '#3b82f6' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteCategory(category.id)}
                        sx={{ color: '#dc2626' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Monthly Budget"
              type="number"
              value={newCategory.monthly_budget}
              onChange={(e) => setNewCategory({ ...newCategory, monthly_budget: parseFloat(e.target.value) || 0 })}
              fullWidth
              InputProps={{ startAdornment: '$' }}
            />

            <TextField
              label="Icon (optional)"
              value={newCategory.icon}
              onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              fullWidth
              placeholder="💰 or icon-name"
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                Choose Color
              </Typography>
              <ColorPalette>
                {predefinedColors.map((color) => (
                  <ColorOption
                    key={color}
                    color={color}
                    selected={newCategory.color === color}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                  />
                ))}
              </ColorPalette>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveCategory} 
            variant="contained"
            disabled={!newCategory.name.trim()}
          >
            {editingCategory ? 'Update' : 'Add'} Category
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  max-width: 1000px;
`;

const SummarySection = styled.div`
  margin-bottom: 32px;
`;

const BudgetCard = styled(Box)`
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const SettingsSection = styled.div`
  margin-bottom: 32px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600 !important;
  color: #1e293b !important;
`;

const ColorDot = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color};
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e5e7eb;
`;

const ColorPalette = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 12px;
  max-width: 400px;
`;

const ColorOption = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: ${props => props.color};
  border: 2px solid ${props => props.selected ? '#2563eb' : '#e5e7eb'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    border-color: #2563eb;
  }
`;

const SaveButtonContainer = styled.div`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-start;
`;

export default CategorySettings; 
