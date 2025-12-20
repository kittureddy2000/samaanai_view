import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
    Box, Button, Typography, Alert, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api, { FINANCE_BASE_PATH } from '../../services/api';

const ImportSettings = () => {
    const [file, setFile] = useState(null);
    const [institutionName, setInstitutionName] = useState('Fidelity');
    const [importType, setImportType] = useState('auto');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
            setError(null);
        }
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('institution_name', institutionName);
            formData.append('type', importType);

            const response = await api.post(`${FINANCE_BASE_PATH}/import/csv/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
            setFile(null);
        } catch (err) {
            console.error('Import error:', err);
            setError(err.response?.data?.error || 'Failed to import file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <ImportContainer>
            <SectionTitle>Import Data from CSV</SectionTitle>
            <SectionDescription>
                Import holdings and transactions from institutions not supported by Plaid (like Fidelity).
                Download your data as CSV from your brokerage and upload it here.
            </SectionDescription>

            {/* Instructions */}
            <InstructionsCard>
                <Typography variant="subtitle2" sx={{ color: '#818cf8', mb: 1 }}>
                    📥 How to Export from Fidelity:
                </Typography>
                <InstructionsList>
                    <li><strong>Holdings:</strong> Go to Positions → Click "Download" → Select CSV</li>
                    <li><strong>Transactions:</strong> Go to Activity & Orders → History → Download</li>
                    <li>The importer will automatically detect the file type</li>
                </InstructionsList>
            </InstructionsCard>

            {/* Settings */}
            <SettingsRow>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Institution</InputLabel>
                    <Select
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        label="Institution"
                        sx={{
                            color: '#fff',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.3)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.5)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                        }}
                    >
                        <MenuItem value="Fidelity">Fidelity</MenuItem>
                        <MenuItem value="BMO Alto">BMO Alto</MenuItem>
                        <MenuItem value="Vanguard">Vanguard</MenuItem>
                        <MenuItem value="Schwab">Schwab</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>File Type</InputLabel>
                    <Select
                        value={importType}
                        onChange={(e) => setImportType(e.target.value)}
                        label="File Type"
                        sx={{
                            color: '#fff',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.3)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.5)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                        }}
                    >
                        <MenuItem value="auto">Auto-detect</MenuItem>
                        <MenuItem value="holdings">Holdings</MenuItem>
                        <MenuItem value="transactions">Transactions</MenuItem>
                    </Select>
                </FormControl>
            </SettingsRow>

            {/* Drop Zone */}
            <DropZone
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                $active={dragActive}
                $hasFile={!!file}
            >
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="csv-upload"
                />
                <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 48, color: file ? '#10b981' : '#818cf8', mb: 2 }} />
                    {file ? (
                        <>
                            <Typography variant="body1" sx={{ color: '#10b981', fontWeight: 500 }}>
                                {file.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                                {(file.size / 1024).toFixed(1)} KB
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="body1" sx={{ color: '#fff' }}>
                                Drag & drop your CSV file here
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                                or click to browse
                            </Typography>
                        </>
                    )}
                </label>
            </DropZone>

            {/* Upload Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <UploadButton
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    variant="contained"
                >
                    {uploading ? (
                        <>
                            <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                            Importing...
                        </>
                    ) : (
                        <>Import Data</>
                    )}
                </UploadButton>
            </Box>

            {/* Result */}
            {result && (
                <ResultCard $success>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CheckCircleIcon sx={{ color: '#10b981' }} />
                        <Typography variant="h6" sx={{ color: '#10b981' }}>Import Successful!</Typography>
                    </Box>
                    <ResultGrid>
                        <ResultItem>
                            <ResultLabel>Institution</ResultLabel>
                            <ResultValue>{result.institution}</ResultValue>
                        </ResultItem>
                        <ResultItem>
                            <ResultLabel>Type</ResultLabel>
                            <ResultValue>{result.import_type}</ResultValue>
                        </ResultItem>
                        <ResultItem>
                            <ResultLabel>Accounts</ResultLabel>
                            <ResultValue>{result.accounts_created} created, {result.accounts_updated} updated</ResultValue>
                        </ResultItem>
                        {result.holdings_created + result.holdings_updated > 0 && (
                            <ResultItem>
                                <ResultLabel>Holdings</ResultLabel>
                                <ResultValue>{result.holdings_created} created, {result.holdings_updated} updated</ResultValue>
                            </ResultItem>
                        )}
                        {result.transactions_created + result.transactions_updated > 0 && (
                            <ResultItem>
                                <ResultLabel>Transactions</ResultLabel>
                                <ResultValue>{result.transactions_created} created, {result.transactions_updated} updated</ResultValue>
                            </ResultItem>
                        )}
                    </ResultGrid>
                    {result.errors && result.errors.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                                ⚠️ {result.errors.length} rows had issues:
                            </Typography>
                            <ErrorList>
                                {result.errors.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                                {result.errors.length > 5 && (
                                    <li>...and {result.errors.length - 5} more</li>
                                )}
                            </ErrorList>
                        </Box>
                    )}
                </ResultCard>
            )}

            {/* Error */}
            {error && (
                <ResultCard $error>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorIcon sx={{ color: '#f87171' }} />
                        <Typography sx={{ color: '#f87171' }}>{error}</Typography>
                    </Box>
                </ResultCard>
            )}
        </ImportContainer>
    );
};

// Styled components
const ImportContainer = styled.div`
  max-width: 700px;
`;

const SectionTitle = styled.h2`
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const SectionDescription = styled.p`
  color: rgba(255,255,255,0.6);
  font-size: 0.9rem;
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const InstructionsCard = styled.div`
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
`;

const InstructionsList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  
  li {
    margin-bottom: 4px;
  }
`;

const SettingsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.$active ? '#6366f1' : props.$hasFile ? '#10b981' : 'rgba(99, 102, 241, 0.3)'};
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  background: ${props => props.$active ? 'rgba(99, 102, 241, 0.1)' : 'rgba(26, 26, 46, 0.5)'};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }
`;

const UploadButton = styled(Button)`
  && {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    padding: 12px 32px;
    font-weight: 500;
    text-transform: none;
    
    &:disabled {
      background: rgba(99, 102, 241, 0.3);
      color: rgba(255,255,255,0.5);
    }
  }
`;

const ResultCard = styled.div`
  margin-top: 24px;
  padding: 20px;
  border-radius: 12px;
  background: ${props => props.$success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)'};
  border: 1px solid ${props => props.$success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(248, 113, 113, 0.3)'};
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const ResultItem = styled.div``;

const ResultLabel = styled.div`
  color: rgba(255,255,255,0.5);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const ResultValue = styled.div`
  color: #fff;
  font-size: 0.9rem;
`;

const ErrorList = styled.ul`
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: rgba(251, 191, 36, 0.8);
  font-size: 0.8rem;
`;

export default ImportSettings;
