import React, { useState } from 'react';
import styled from 'styled-components';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    Autocomplete,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    AccountBalance as BankIcon,
    CurrencyBitcoin as CryptoIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createManualAccount } from '../services/api';

// Preset institution options
const PRESET_INSTITUTIONS = [
    { id: 'coinbase', name: 'Coinbase', color: '#0052ff', type: 'crypto' },
    { id: 'robinhood', name: 'Robinhood', color: '#00c805', type: 'investment' },
    { id: 'crypto.com', name: 'Crypto.com', color: '#103f68', type: 'crypto' },
    { id: 'binance', name: 'Binance', color: '#f3ba2f', type: 'crypto' },
    { id: 'venmo', name: 'Venmo', color: '#3d95ce', type: 'payment' },
    { id: 'paypal', name: 'PayPal', color: '#003087', type: 'payment' },
    { id: 'cash_app', name: 'Cash App', color: '#00d632', type: 'payment' },
    { id: 'custom', name: 'Custom / Other', color: '#6b7280', type: 'other' },
];

const ACCOUNT_TYPES = [
    { value: 'depository', label: 'Checking / Savings' },
    { value: 'investment', label: 'Investment / Brokerage' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'loan', label: 'Loan' },
    { value: 'other', label: 'Other' },
];

const ACCOUNT_SUBTYPES = {
    depository: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
        { value: 'money_market', label: 'Money Market' },
    ],
    investment: [
        { value: 'brokerage', label: 'Brokerage' },
        { value: '401k', label: '401(k)' },
        { value: 'ira', label: 'IRA' },
        { value: 'roth', label: 'Roth IRA' },
    ],
    credit: [
        { value: 'credit_card', label: 'Credit Card' },
    ],
    loan: [
        { value: 'mortgage', label: 'Mortgage' },
        { value: 'auto', label: 'Auto Loan' },
        { value: 'student', label: 'Student Loan' },
        { value: 'other', label: 'Other Loan' },
    ],
    other: [
        { value: 'other', label: 'Other' },
    ],
};

const AddManualAccountDialog = ({ open, onClose, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [customInstitutionName, setCustomInstitutionName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountType, setAccountType] = useState('investment');
    const [accountSubtype, setAccountSubtype] = useState('brokerage');
    const [currentBalance, setCurrentBalance] = useState('');

    const handleClose = () => {
        // Reset form
        setSelectedInstitution(null);
        setCustomInstitutionName('');
        setAccountName('');
        setAccountType('investment');
        setAccountSubtype('brokerage');
        setCurrentBalance('');
        setError(null);
        onClose();
    };

    const handleInstitutionChange = (event, value) => {
        setSelectedInstitution(value);
        if (value && value.id !== 'custom') {
            setCustomInstitutionName('');
            // Auto-suggest account name
            if (!accountName) {
                setAccountName(`My ${value.name} Account`);
            }
            // Auto-suggest account type based on institution
            if (value.type === 'crypto') {
                setAccountType('investment');
                setAccountSubtype('brokerage');
            } else if (value.type === 'payment') {
                setAccountType('depository');
                setAccountSubtype('checking');
            }
        }
    };

    const handleAccountTypeChange = (event) => {
        const newType = event.target.value;
        setAccountType(newType);
        // Reset subtype when type changes
        const subtypes = ACCOUNT_SUBTYPES[newType] || ACCOUNT_SUBTYPES.other;
        setAccountSubtype(subtypes[0]?.value || 'other');
    };

    const handleSubmit = async () => {
        const institutionName = selectedInstitution?.id === 'custom'
            ? customInstitutionName
            : selectedInstitution?.name;

        if (!institutionName) {
            setError('Please select or enter an institution name');
            return;
        }

        if (!accountName.trim()) {
            setError('Please enter an account name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await createManualAccount({
                institution_name: institutionName,
                account_name: accountName.trim(),
                account_type: accountType,
                account_subtype: accountSubtype,
                current_balance: parseFloat(currentBalance) || 0,
            });

            enqueueSnackbar(`Account "${accountName}" created successfully!`, { variant: 'success' });
            handleClose();

            if (onSuccess) {
                onSuccess(result);
            }
        } catch (err) {
            console.error('Error creating manual account:', err);
            setError(err.message || 'Failed to create account');
            enqueueSnackbar('Failed to create account', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const subtypeOptions = ACCOUNT_SUBTYPES[accountType] || ACCOUNT_SUBTYPES.other;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '16px',
                }
            }}
        >
            <StyledDialogTitle>
                <TitleContent>
                    <CryptoIcon sx={{ color: '#818cf8', fontSize: '1.5rem' }} />
                    Add Manual Account
                </TitleContent>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </StyledDialogTitle>

            <StyledDialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <FormGroup>
                    <FormLabel>Institution</FormLabel>
                    <Autocomplete
                        options={PRESET_INSTITUTIONS}
                        getOptionLabel={(option) => option.name}
                        value={selectedInstitution}
                        onChange={handleInstitutionChange}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <OptionContent>
                                    <OptionIcon style={{ backgroundColor: option.color }}>
                                        {option.type === 'crypto' ? '₿' : '🏦'}
                                    </OptionIcon>
                                    {option.name}
                                </OptionContent>
                            </li>
                        )}
                        renderInput={(params) => (
                            <StyledTextField
                                {...params}
                                placeholder="Select or type institution name..."
                                variant="outlined"
                                size="small"
                            />
                        )}
                        freeSolo={false}
                    />
                </FormGroup>

                {selectedInstitution?.id === 'custom' && (
                    <FormGroup>
                        <FormLabel>Custom Institution Name</FormLabel>
                        <StyledTextField
                            value={customInstitutionName}
                            onChange={(e) => setCustomInstitutionName(e.target.value)}
                            placeholder="Enter institution name..."
                            variant="outlined"
                            size="small"
                            fullWidth
                        />
                    </FormGroup>
                )}

                <FormGroup>
                    <FormLabel>Account Name</FormLabel>
                    <StyledTextField
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g., My Coinbase Portfolio"
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                </FormGroup>

                <FormRow>
                    <FormGroup style={{ flex: 1 }}>
                        <FormLabel>Account Type</FormLabel>
                        <StyledFormControl variant="outlined" size="small" fullWidth>
                            <Select
                                value={accountType}
                                onChange={handleAccountTypeChange}
                            >
                                {ACCOUNT_TYPES.map(type => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </StyledFormControl>
                    </FormGroup>

                    <FormGroup style={{ flex: 1 }}>
                        <FormLabel>Subtype</FormLabel>
                        <StyledFormControl variant="outlined" size="small" fullWidth>
                            <Select
                                value={accountSubtype}
                                onChange={(e) => setAccountSubtype(e.target.value)}
                            >
                                {subtypeOptions.map(subtype => (
                                    <MenuItem key={subtype.value} value={subtype.value}>
                                        {subtype.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </StyledFormControl>
                    </FormGroup>
                </FormRow>

                <FormGroup>
                    <FormLabel>Current Balance (optional)</FormLabel>
                    <StyledTextField
                        value={currentBalance}
                        onChange={(e) => setCurrentBalance(e.target.value)}
                        placeholder="0.00"
                        variant="outlined"
                        size="small"
                        fullWidth
                        type="number"
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                    />
                </FormGroup>

                <HelpText>
                    Manual accounts let you track assets from platforms that don't connect via Plaid.
                    You can upload transactions later via CSV import.
                </HelpText>
            </StyledDialogContent>

            <StyledDialogActions>
                <CancelButton onClick={handleClose}>
                    Cancel
                </CancelButton>
                <CreateButton
                    onClick={handleSubmit}
                    disabled={loading || !selectedInstitution}
                    variant="contained"
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
                </CreateButton>
            </StyledDialogActions>
        </Dialog>
    );
};

// Styled components
const StyledDialogTitle = styled(DialogTitle)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  color: #fff;
`;

const TitleContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.25rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
  
  &:hover {
    color: #fff;
  }
`;

const StyledDialogContent = styled(DialogContent)`
  padding: 24px !important;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin-bottom: 8px;
  font-weight: 500;
`;

const StyledTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #fff;
    
    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: rgba(99, 102, 241, 0.5);
    }
    
    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: #818cf8;
    }
  }
  
  & .MuiOutlinedInput-notchedOutline {
    border-color: rgba(99, 102, 241, 0.2);
  }
  
  & .MuiInputBase-input {
    color: #fff;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }
  
  & .MuiInputAdornment-root {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const StyledFormControl = styled(FormControl)`
  & .MuiOutlinedInput-root {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #fff;
    
    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: rgba(99, 102, 241, 0.5);
    }
    
    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: #818cf8;
    }
  }
  
  & .MuiOutlinedInput-notchedOutline {
    border-color: rgba(99, 102, 241, 0.2);
  }
  
  & .MuiSelect-select {
    color: #fff;
  }
  
  & .MuiSvgIcon-root {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const OptionContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const OptionIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
`;

const HelpText = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 16px;
  line-height: 1.5;
`;

const StyledDialogActions = styled(DialogActions)`
  padding: 16px 24px;
  border-top: 1px solid rgba(99, 102, 241, 0.15);
  gap: 12px;
`;

const CancelButton = styled(Button)`
  color: rgba(255, 255, 255, 0.7) !important;
  
  &:hover {
    color: #fff !important;
    background: rgba(255, 255, 255, 0.05) !important;
  }
`;

const CreateButton = styled(Button)`
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 8px 24px !important;
  font-weight: 600 !important;
  
  &:hover {
    background: linear-gradient(135deg, #5558e3 0%, #7477ea 100%) !important;
  }
  
  &:disabled {
    opacity: 0.5 !important;
  }
`;

export default AddManualAccountDialog;
