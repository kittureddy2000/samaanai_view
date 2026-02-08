import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    TextField,
    Box,
    LinearProgress,
    Typography
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Description as PdfIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { importPDFTransactions, confirmPDFImport } from '../services/api';

const PDFImportDialog = ({ open, onClose, onSuccess, accounts = [] }) => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [step, setStep] = useState('upload'); // 'upload', 'processing', 'preview', 'importing'
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [importId, setImportId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [error, setError] = useState(null);
    const [editingRow, setEditingRow] = useState(null);

    // Filter to only manual accounts
    const manualAccounts = accounts.filter(acc => acc.is_manual);

    const handleClose = () => {
        setStep('upload');
        setSelectedFile(null);
        setSelectedAccountId('');
        setImportId(null);
        setTransactions([]);
        setMetadata(null);
        setError(null);
        setEditingRow(null);
        onClose();
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                setSelectedFile(file);
                setError(null);
            } else {
                setError('Please select a PDF file');
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!selectedFile || !selectedAccountId) {
            setError('Please select a file and an account');
            return;
        }

        setStep('processing');
        setError(null);

        try {
            const result = await importPDFTransactions(selectedFile, selectedAccountId);

            if (result.status === 'no_transactions') {
                setError('No transactions could be extracted from this PDF');
                setStep('upload');
                return;
            }

            setImportId(result.import_id);
            setTransactions(result.transactions);
            setMetadata(result.metadata);
            setStep('preview');

        } catch (err) {
            setError(err.message || 'Failed to process PDF');
            setStep('upload');
        }
    };

    const handleConfirmImport = async () => {
        setStep('importing');
        setError(null);

        try {
            const result = await confirmPDFImport(importId, transactions);

            enqueueSnackbar(
                `Successfully imported ${result.transactions_created} transactions!`,
                { variant: 'success' }
            );

            handleClose();
            if (onSuccess) {
                onSuccess(result);
            }
        } catch (err) {
            setError(err.message || 'Failed to import transactions');
            setStep('preview');
        }
    };

    const handleDeleteTransaction = (index) => {
        setTransactions(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditTransaction = (index, field, value) => {
        setTransactions(prev => prev.map((txn, i) =>
            i === index ? { ...txn, [field]: value } : txn
        ));
    };

    const formatAmount = (amount) => {
        const num = parseFloat(amount);
        const formatted = Math.abs(num).toFixed(2);
        return num >= 0 ? `+$${formatted}` : `-$${formatted}`;
    };

    const getCategoryColor = (category) => {
        const colors = {
            'CRYPTO': '#f7931a',
            'INVESTMENT': '#00c805',
            'INCOME': '#22c55e',
            'TRANSFER': '#3b82f6',
            'SHOPPING': '#ec4899',
            'FOOD': '#f59e0b',
            'ENTERTAINMENT': '#8b5cf6',
            'BILLS': '#ef4444',
            'OTHER': '#6b7280',
        };
        return colors[category] || colors.OTHER;
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '16px',
                    minHeight: '500px',
                }
            }}
        >
            <StyledDialogTitle>
                <TitleContent>
                    <PdfIcon sx={{ color: '#818cf8', fontSize: '1.5rem' }} />
                    Import Transactions from PDF
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

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <>
                        <FormGroup>
                            <FormLabel>Select Account</FormLabel>
                            <StyledFormControl variant="outlined" size="small" fullWidth>
                                <Select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="" disabled>Select a manual account...</MenuItem>
                                    {manualAccounts.map(acc => (
                                        <MenuItem key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.institution?.name || 'Manual'})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </StyledFormControl>
                            {manualAccounts.length === 0 && (
                                <HelpText>No manual accounts found. Create a manual account first.</HelpText>
                            )}
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>Upload PDF Statement</FormLabel>
                            <DropZone {...getRootProps()} $isDragActive={isDragActive} $hasFile={!!selectedFile}>
                                <input {...getInputProps()} />
                                {selectedFile ? (
                                    <FilePreview>
                                        <PdfIcon sx={{ fontSize: 48, color: '#ef4444' }} />
                                        <FileName>{selectedFile.name}</FileName>
                                        <FileSize>{(selectedFile.size / 1024).toFixed(1)} KB</FileSize>
                                    </FilePreview>
                                ) : (
                                    <>
                                        <UploadIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                                        <DropText>
                                            {isDragActive
                                                ? 'Drop the PDF here...'
                                                : 'Drag & drop a PDF, or click to select'}
                                        </DropText>
                                        <DropHint>Supports bank statements, crypto exchange statements, etc.</DropHint>
                                    </>
                                )}
                            </DropZone>
                        </FormGroup>
                    </>
                )}

                {/* Step 2: Processing */}
                {step === 'processing' && (
                    <ProcessingContainer>
                        <CircularProgress size={60} sx={{ color: '#818cf8' }} />
                        <ProcessingText>Extracting transactions from PDF...</ProcessingText>
                        <ProcessingSubtext>
                            Using AI to identify and parse transactions. This may take a moment.
                        </ProcessingSubtext>
                    </ProcessingContainer>
                )}

                {/* Step 3: Preview */}
                {step === 'preview' && (
                    <>
                        <PreviewHeader>
                            <Typography variant="h6" sx={{ color: '#fff' }}>
                                {transactions.length} transactions found
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                Review and edit before importing
                            </Typography>
                        </PreviewHeader>

                        <StyledTableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <StyledHeaderCell>Date</StyledHeaderCell>
                                        <StyledHeaderCell>Description</StyledHeaderCell>
                                        <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                                        <StyledHeaderCell>Category</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((txn, index) => (
                                        <StyledTableRow key={index}>
                                            <StyledCell>{txn.date}</StyledCell>
                                            <StyledCell>
                                                {editingRow === index ? (
                                                    <TextField
                                                        size="small"
                                                        value={txn.description}
                                                        onChange={(e) => handleEditTransaction(index, 'description', e.target.value)}
                                                        sx={{
                                                            input: { color: '#fff', fontSize: '0.875rem' },
                                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.3)' }
                                                        }}
                                                    />
                                                ) : (
                                                    txn.description
                                                )}
                                            </StyledCell>
                                            <StyledCell align="right">
                                                <AmountChip $isPositive={parseFloat(txn.amount) >= 0}>
                                                    {formatAmount(txn.amount)}
                                                </AmountChip>
                                            </StyledCell>
                                            <StyledCell>
                                                <Chip
                                                    label={txn.category}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: getCategoryColor(txn.category),
                                                        color: '#fff',
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            </StyledCell>
                                            <StyledCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setEditingRow(editingRow === index ? null : index)}
                                                    sx={{ color: editingRow === index ? '#22c55e' : 'rgba(255,255,255,0.5)' }}
                                                >
                                                    {editingRow === index ? <CheckIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteTransaction(index)}
                                                    sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ef4444' } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </StyledCell>
                                        </StyledTableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </StyledTableContainer>
                    </>
                )}

                {/* Step 4: Importing */}
                {step === 'importing' && (
                    <ProcessingContainer>
                        <CircularProgress size={60} sx={{ color: '#22c55e' }} />
                        <ProcessingText>Importing transactions...</ProcessingText>
                    </ProcessingContainer>
                )}
            </StyledDialogContent>

            <StyledDialogActions>
                <CancelButton onClick={handleClose}>
                    Cancel
                </CancelButton>

                {step === 'upload' && (
                    <ActionButton
                        onClick={handleUpload}
                        disabled={!selectedFile || !selectedAccountId}
                        variant="contained"
                    >
                        Extract Transactions
                    </ActionButton>
                )}

                {step === 'preview' && (
                    <ActionButton
                        onClick={handleConfirmImport}
                        disabled={transactions.length === 0}
                        variant="contained"
                        sx={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important' }}
                    >
                        Import {transactions.length} Transactions
                    </ActionButton>
                )}
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
  min-height: 300px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin-bottom: 8px;
  font-weight: 500;
`;

const StyledFormControl = styled(FormControl)`
  & .MuiOutlinedInput-root {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #fff;
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

const DropZone = styled.div`
  border: 2px dashed ${props => props.$isDragActive ? '#818cf8' : props.$hasFile ? '#22c55e' : 'rgba(99, 102, 241, 0.3)'};
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$isDragActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  
  &:hover {
    border-color: #818cf8;
    background: rgba(99, 102, 241, 0.05);
  }
`;

const DropText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 16px 0 8px;
  font-size: 1rem;
`;

const DropHint = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  margin: 0;
`;

const FilePreview = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const FileName = styled.span`
  color: #fff;
  font-weight: 500;
`;

const FileSize = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
`;

const HelpText = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 8px;
`;

const ProcessingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 20px;
`;

const ProcessingText = styled.p`
  color: #fff;
  font-size: 1.1rem;
  margin: 0;
`;

const ProcessingSubtext = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin: 0;
`;

const PreviewHeader = styled.div`
  margin-bottom: 16px;
`;

const StyledTableContainer = styled(TableContainer)`
  background: rgba(0, 0, 0, 0.2) !important;
  border-radius: 8px !important;
  max-height: 300px;
`;

const StyledHeaderCell = styled(TableCell)`
  color: rgba(255, 255, 255, 0.7) !important;
  font-weight: 600 !important;
  background: rgba(99, 102, 241, 0.1) !important;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2) !important;
`;

const StyledTableRow = styled(TableRow)`
  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }
`;

const StyledCell = styled(TableCell)`
  color: rgba(255, 255, 255, 0.9) !important;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1) !important;
  font-size: 0.875rem !important;
`;

const AmountChip = styled.span`
  color: ${props => props.$isPositive ? '#22c55e' : '#ef4444'};
  font-weight: 600;
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

const ActionButton = styled(Button)`
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

export default PDFImportDialog;
