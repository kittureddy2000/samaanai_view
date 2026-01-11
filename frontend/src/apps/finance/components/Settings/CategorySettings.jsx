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
  CircularProgress,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MonetizationOn as BudgetIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SubdirectoryArrowRight as SubcategoryIcon
} from '@mui/icons-material';
import styled from 'styled-components';
import api from '../../services/api';

const SettingsContainer = styled(Box)`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const SettingsSection = styled(Box)`
  margin-bottom: 32px;
`;

const SummarySection = styled(Box)`
  margin-bottom: 24px;
`;

const SectionHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 600;
  color: #1e293b;
`;

const BudgetCard = styled(Paper)`
  padding: 16px;
  text-align: center;
  flex: 1;
`;

const ColorDot = styled(Box)`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color || '#6B7280'};
  flex-shrink: 0;
`;

const SaveButtonContainer = styled(Box)`
  display: flex;
  justify-content: flex-start;
  margin-top: 24px;
`;

const ColorOption = styled(Box)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid ${props => props.selected ? '#1e293b' : 'transparent'};
  background-color: ${props => props.color};
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const ChildRow = styled(TableRow)`
  background-color: #f8fafc;
`;

const CategorySettings = () => {
  const [categories, setCategories] = useState([]);
  const [treeCategories, setTreeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [newCategory, setNewCategory] = useState({
    name: '',
    monthly_budget: 0,
    color: '#3498db',
    icon: '',
    parent: null
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);

  // Load categories using tree endpoint
  const loadCategories = async () => {
    try {
      setLoading(true);
      // Fetch hierarchical tree
      const treeResponse = await api.get('/api/finance/spending-categories/tree/');
      const treeData = treeResponse.data.results || treeResponse.data;
      setTreeCategories(Array.isArray(treeData) ? treeData : []);

      // Also fetch flat list for parent selector
      const flatResponse = await api.get('/api/finance/spending-categories/?parent_only=true');
      const flatData = flatResponse.data.results || flatResponse.data;
      setParentCategories(Array.isArray(flatData) ? flatData : []);

      // Keep flat list for totals
      const allResponse = await api.get('/api/finance/spending-categories/');
      const allData = allResponse.data.results || allResponse.data;
      setCategories(Array.isArray(allData) ? allData : []);

      setError('');
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddCategory = (parentId = null) => {
    setEditingCategory(null);
    setNewCategory({
      name: '',
      monthly_budget: 0,
      color: '#3498db',
      icon: '',
      parent: parentId
    });
    setOpenDialog(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      monthly_budget: category.monthly_budget || 0,
      color: category.color || '#3498db',
      icon: category.icon || '',
      parent: category.parent || null
    });
    setOpenDialog(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) {
      try {
        await api.delete(`/api/finance/spending-categories/${categoryId}/`);
        loadCategories();
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
        await api.patch(`/api/finance/spending-categories/${editingCategory.id}/`, newCategory);
      } else {
        await api.post('/api/finance/spending-categories/', newCategory);
      }
      setOpenDialog(false);
      loadCategories();
      handleSave();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category');
    }
  };

  const toggleExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const predefinedColors = [
    '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899',
    '#10b981', '#06b6d4', '#a855f7', '#dc2626', '#22c55e',
    '#6366f1', '#84cc16', '#fb923c', '#14b8a6', '#f43f5e'
  ];

  // Calculate totals from parent categories only (they aggregate children)
  const parentCats = categories.filter(c => !c.parent);
  const totalBudget = parentCats.reduce((sum, cat) => sum + (parseFloat(cat.monthly_budget) || 0), 0);
  const totalSpending = categories.reduce((sum, cat) => sum + (parseFloat(cat.current_month_spending) || 0), 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const renderCategoryRow = (category, level = 0) => {
    const isExpanded = expandedCategories[category.id];
    const hasChildren = category.children && category.children.length > 0;
    const isParent = hasChildren || level === 0;

    return (
      <React.Fragment key={category.id}>
        <TableRow
          hover
          sx={{
            backgroundColor: level === 0 ? '#fff' : '#f8fafc',
            '&:hover': { backgroundColor: level === 0 ? '#f1f5f9' : '#e2e8f0' }
          }}
        >
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: level * 3 }}>
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={() => toggleExpand(category.id)}
                  sx={{ p: 0.5 }}
                >
                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              )}
              {!hasChildren && level > 0 && (
                <SubcategoryIcon fontSize="small" sx={{ color: '#9ca3af', ml: 0.5 }} />
              )}
              <ColorDot color={category.color} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: level === 0 ? 600 : 500 }}>
                  {category.icon && <span style={{ marginRight: 6 }}>{category.icon}</span>}
                  {category.name}
                </Typography>
                {hasChildren && (
                  <Typography variant="caption" color="text.secondary">
                    {category.children.length} subcategories
                  </Typography>
                )}
              </Box>
            </Box>
          </TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {category.monthly_budget ? `$${parseFloat(category.monthly_budget).toLocaleString()}` : '-'}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: hasChildren ? '#1e293b' : '#059669'
              }}
            >
              ${(hasChildren ? category.total_spending : category.current_month_spending)?.toLocaleString() || '0'}
              {hasChildren && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (total)
                </Typography>
              )}
            </Typography>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {level === 0 && (
                <Tooltip title="Add subcategory">
                  <IconButton
                    size="small"
                    onClick={() => handleAddCategory(category.id)}
                    sx={{ color: '#22c55e' }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={() => handleEditCategory(category)}
                  sx={{ color: '#3b82f6' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteCategory(category.id)}
                  sx={{ color: '#dc2626' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </TableCell>
        </TableRow>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <TableRow>
            <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
              <Collapse in={isExpanded}>
                <Table size="small">
                  <TableBody>
                    {category.children.map(child => renderCategoryRow(child, level + 1))}
                  </TableBody>
                </Table>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

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
              onClick={() => handleAddCategory(null)}
              size="small"
            >
              Add Category
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <BudgetCard elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
              <Typography variant="body2" color="text.secondary">Total Monthly Budget</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#dc2626' }}>
                ${totalBudget.toLocaleString()}
              </Typography>
            </BudgetCard>
            <BudgetCard elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
              <Typography variant="body2" color="text.secondary">Current Spending</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#059669' }}>
                ${totalSpending.toLocaleString()}
              </Typography>
            </BudgetCard>
            <BudgetCard elevation={0} sx={{ border: '1px solid #e5e7eb' }}>
              <Typography variant="body2" color="text.secondary">Total Categories</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {treeCategories.length} parent, {categories.length} total
              </Typography>
            </BudgetCard>
          </Box>
        </Paper>
      </SummarySection>

      {/* Categories Tree */}
      <SettingsSection>
        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon sx={{ color: '#dc2626' }} />
            <SectionTitle variant="h6">Spending Categories</SectionTitle>
          </Box>
          <Button
            size="small"
            onClick={() => setExpandedCategories(
              treeCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
            )}
          >
            Expand All
          </Button>
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
              {treeCategories.map(category => renderCategoryRow(category, 0))}
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
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Parent Category</InputLabel>
              <Select
                value={newCategory.parent || ''}
                onChange={(e) => setNewCategory({ ...newCategory, parent: e.target.value || null })}
                label="Parent Category"
              >
                <MenuItem value="">
                  <em>None (Top-level category)</em>
                </MenuItem>
                {parentCategories
                  .filter(cat => cat.id !== editingCategory?.id)
                  .map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.icon && <span style={{ marginRight: 8 }}>{cat.icon}</span>}
                      {cat.name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>

            <TextField
              label="Monthly Budget"
              type="number"
              value={newCategory.monthly_budget}
              onChange={(e) => setNewCategory({ ...newCategory, monthly_budget: parseFloat(e.target.value) || 0 })}
              fullWidth
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
            />

            <TextField
              label="Icon (emoji)"
              value={newCategory.icon}
              onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              fullWidth
              placeholder="e.g., 🍔 or 🚗"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {predefinedColors.map((color) => (
                  <ColorOption
                    key={color}
                    color={color}
                    selected={newCategory.color === color}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                  />
                ))}
              </Box>
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
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsContainer>
  );
};

export default CategorySettings;
