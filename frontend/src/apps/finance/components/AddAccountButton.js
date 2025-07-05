import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { usePlaidLink } from 'react-plaid-link';
import { useSnackbar } from 'notistack';
import { createLinkToken, exchangePublicToken } from '../services/api';
import Tooltip from '@mui/material/Tooltip';
import { Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const AddAccountButton = ({ onAccountAdded }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch link_token when component mounts
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await createLinkToken();
        if (data && data.link_token) {
          setLinkToken(data.link_token);
        } else {
          console.error("AddAccountButton: Failed to get link_token from backend response. Data:", data);
          enqueueSnackbar('Could not initialize Plaid Link: Invalid response from backend.', { variant: 'error' });
        }
      } catch (error) {
        console.error('AddAccountButton: Error during createLinkToken() call or subsequent processing:', error);
        enqueueSnackbar('Failed to initialize Plaid Link. Check console for details.', { variant: 'error' });
      }
    };
    fetchToken();
  }, [enqueueSnackbar]);

  const { open, ready, error: plaidError } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      // Exchange public token for access token
      exchangePublicToken(public_token)
        .then(() => {
          enqueueSnackbar('Account linked successfully!', { variant: 'success' });
          // Trigger account refresh
          if (onAccountAdded) {
            onAccountAdded();
          }
        })
        .catch((e) => {
          console.error('AddAccountButton: Error exchanging public token:', e);
          enqueueSnackbar('Failed to complete account linking. Please try again.', { variant: 'error' });
        });
    },
    onExit: (err, metadata) => {
      if (err != null) {
        enqueueSnackbar(`Plaid Link exited with error: ${err.display_message || err.error_message || 'Unknown error'}`, { variant: 'warning' });
      }
    },
  });

  useEffect(() => {
    if (plaidError) {
      console.error("AddAccountButton: usePlaidLink hook error state:", plaidError);
      enqueueSnackbar(`Plaid setup error: ${plaidError.display_message || plaidError.error_message || 'Unknown Plaid error. Check console.'}`, { variant: 'error' });
    }
  }, [plaidError, enqueueSnackbar]);

  // Determine button disabled state and tooltip message
  const isFetchingToken = linkToken === null && !plaidError; // True while token is being fetched and no Plaid error yet
  const isDisabled = !ready || !linkToken; // Disabled if Plaid not ready OR no link token

  let tooltipMessage = 'Link New Account';
  if (isFetchingToken) {
    tooltipMessage = 'Initializing: Fetching Plaid configuration...';
  } else if (!linkToken && !plaidError) { // Should ideally be covered by isFetchingToken, but as a fallback
    tooltipMessage = 'Plaid configuration not loaded. Token missing.';
  } else if (plaidError) {
    tooltipMessage = `Plaid Error: ${plaidError.display_message || plaidError.error_message || 'See console for details.'}`;
  } else if (!ready && linkToken) { // Token is present, but Plaid SDK says not ready
    tooltipMessage = 'Plaid Link is initializing with token...';
  } else if (isDisabled) { // General disabled state not caught by specific conditions above
    tooltipMessage = 'Plaid Link not ready. Check API keys or backend connection.';
  }

  return (
    <Tooltip title={tooltipMessage}>
      <span>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => {
            if (ready && linkToken) {
              open();
            } else {
              enqueueSnackbar('Plaid is not ready. Please wait or check for errors.', {variant: 'warning'});
            }
          }}
          disabled={isDisabled}
        >
          Add Account
        </Button>
      </span>
    </Tooltip>
  );
};

const ButtonRoot = styled.button`
  display: flex;
  align-items: center;
  background: #e3f0fc;
  color: #1976d2;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  padding: 10px 18px;
  margin: 0 16px 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: #d0e7fa;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default AddAccountButton; 