import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaFingerprint, FaTrash, FaPlus } from 'react-icons/fa';
import { format } from 'date-fns';

import { useAuth } from '../../../common/auth';
import {
  Card,
  Button,
  Title,
  Text,
  Spinner,
  Input,
  FormGroup,
  Label
} from 'common/components/UI';

const PasskeyManager = () => {
  const { registerPasskey, getPasskeys, deletePasskey, error, setError } = useAuth();
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const loadPasskeys = useCallback(async () => {
    try {
      setLoading(true);
      const keys = await getPasskeys();
      setPasskeys(keys);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
    } finally {
      setLoading(false);
    }
  }, [getPasskeys]);

  useEffect(() => {
    // Check if WebAuthn is supported
    if (window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
        setPasskeySupported(available);
      });
    }
    
    // Load existing passkeys
    loadPasskeys();
  }, [loadPasskeys]);

  const handleRegisterPasskey = async (e) => {
    e.preventDefault();
    if (!passkeySupported) {
      setError('Passkeys are not supported on this device');
      return;
    }

    try {
      setRegistering(true);
      setError('');
      
      const name = newPasskeyName.trim() || `Passkey ${new Date().toLocaleDateString()}`;
      await registerPasskey(name);
      
      // Reload passkeys
      await loadPasskeys();
      setNewPasskeyName('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to register passkey:', err);
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (credentialId, name) => {
    if (!window.confirm(`Are you sure you want to delete the passkey "${name}"?`)) {
      return;
    }

    try {
      await deletePasskey(credentialId);
      await loadPasskeys();
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      setError('Failed to delete passkey');
    }
  };

  if (!passkeySupported) {
    return (
      <PasskeyCard>
        <Title size="1.25rem">Passkeys</Title>
        <Text color="#6b7280">
          Passkeys are not supported on this device or browser. Please use a device with biometric authentication support.
        </Text>
      </PasskeyCard>
    );
  }

  return (
    <PasskeyCard>
      <PasskeyHeader>
        <div>
          <Title size="1.25rem">Passkeys</Title>
          <Text color="#6b7280">
            Passkeys provide secure, passwordless authentication using your device's biometric features.
          </Text>
        </div>
        <AddButton
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
        >
          <FaPlus style={{ marginRight: '8px' }} />
          Add Passkey
        </AddButton>
      </PasskeyHeader>

      {error && (
        <ErrorBanner>
          <Text color="white" noMargin>{error}</Text>
        </ErrorBanner>
      )}

      {showAddForm && (
        <AddPasskeyForm onSubmit={handleRegisterPasskey}>
          <FormGroup>
            <Label htmlFor="passkeyName">Passkey Name (Optional)</Label>
            <Input
              id="passkeyName"
              type="text"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder="e.g., My iPhone, Work MacBook"
            />
          </FormGroup>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddForm(false)}
              disabled={registering}
            >
              Cancel
            </Button>
            <RegisterButton
              type="submit"
              disabled={registering}
            >
              {registering ? (
                <>
                  <Spinner size="16px" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FaFingerprint style={{ marginRight: '8px' }} />
                  Create Passkey
                </>
              )}
            </RegisterButton>
          </FormActions>
        </AddPasskeyForm>
      )}

      {loading ? (
        <LoadingContainer>
          <Spinner />
          <Text>Loading passkeys...</Text>
        </LoadingContainer>
      ) : passkeys.length === 0 ? (
        <EmptyState>
          <FaFingerprint size={48} color="#d1d5db" />
          <Text>No passkeys registered yet</Text>
          <Text color="#6b7280" size="0.9rem">
            Add a passkey to enable quick and secure sign-in
          </Text>
        </EmptyState>
      ) : (
        <PasskeyList>
          {passkeys.map((passkey) => (
            <PasskeyItem key={passkey.id}>
              <PasskeyInfo>
                <FaFingerprint size={24} color="#1a73e8" />
                <div>
                  <PasskeyName>{passkey.name}</PasskeyName>
                  <PasskeyMeta>
                    Created: {format(new Date(passkey.created_at), 'MMM d, yyyy')}
                    {passkey.last_used && (
                      <span> • Last used: {format(new Date(passkey.last_used), 'MMM d, yyyy')}</span>
                    )}
                  </PasskeyMeta>
                </div>
              </PasskeyInfo>
              <DeleteButton
                onClick={() => handleDeletePasskey(passkey.id, passkey.name)}
                title="Delete passkey"
              >
                <FaTrash />
              </DeleteButton>
            </PasskeyItem>
          ))}
        </PasskeyList>
      )}
    </PasskeyCard>
  );
};

// Styled components
const PasskeyCard = styled(Card)`
  margin-top: 2rem;
`;

const PasskeyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const AddButton = styled(Button)`
  background-color: #1a73e8;
  color: white;
  border: 1px solid #1a73e8;
  
  &:hover {
    background-color: #1565c0;
    border-color: #1565c0;
  }
`;

const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1rem;
`;

const AddPasskeyForm = styled.form`
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 1.5rem;
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const RegisterButton = styled(Button)`
  background-color: #1a73e8;
  color: white;
  border: 1px solid #1a73e8;
  
  &:hover {
    background-color: #1565c0;
    border-color: #1565c0;
  }
  
  &:disabled {
    background-color: #94a3b8;
    border-color: #94a3b8;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 2rem;
  text-align: center;
  gap: 0.5rem;
`;

const PasskeyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PasskeyItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: white;
`;

const PasskeyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PasskeyName = styled.div`
  font-weight: 500;
  color: #1f2937;
`;

const PasskeyMeta = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #fee2e2;
  }
`;

export default PasskeyManager;