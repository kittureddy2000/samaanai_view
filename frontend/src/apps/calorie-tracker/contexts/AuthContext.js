// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api'; // Make sure api service is correctly defined

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // Define setError state

  // Fetch current user profile
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('accessToken');
    
    try {
      setLoading(true);
      
      const response = await api.get('api/users/me/');
      setCurrentUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      console.error('Error response:', error.response?.status, error.response?.data);
      setCurrentUser(null);
      setLoading(false);
      
      // Clear token if unauthorized
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
      }
      return null;
    }
  };

  // Check for existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser(); // Use fetchCurrentUser instead of fetchUserProfile
    } else {
      setLoading(false);
    }
  }, []);


  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      // Update to use the correct token endpoint
      const response = await api.post('api/token/', { username, password });
      const { access, refresh } = response.data;
      
      // Return tokens to be handled by the calling component
      return { access, refresh };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw err; // Re-throw error for component handling
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      // Use the received userData directly
      const payload = userData;

      // Path is correct relative to baseURL which already includes /api
      const response = await api.post('api/users/register/', payload); 
      return response.data;

    } catch (error) {
      console.error('API Registration error in AuthContext:', error);
      if (error.response && error.response.data) {
        console.error('Error response data:', JSON.stringify(error.response.data)); 
      }
      throw error; 
    }
  };

  const logout = () => {
    setAuthTokens(null, null); // Call with null to clear tokens and auth header
    setCurrentUser(null); // Clear user state
    // Optional: redirect to login
    // navigate('/login'); 
  };

  // Update user metrics (weight, metabolic rate, etc.)
  const updateMetrics = async (metricsData) => {
      try {
        setError('');
        
        // Make sure currentUser and profile exist before patching
        let userRef = currentUser;
        if (!userRef || !userRef.profile) {
            userRef = await fetchCurrentUser();
            if (!userRef || !userRef.profile) {
                throw new Error("User profile not loaded.");
            }
        }
        
        // Path is correct relative to baseURL which already includes /api
        const response = await api.patch('api/users/profile/metrics/', metricsData);

        // Update stored user data correctly
        const updatedUser = {
          ...userRef,
          profile: {
            ...userRef.profile,
            ...response.data // Merge metrics update response
          }
        };
        setCurrentUser(updatedUser); // Update state

        return updatedUser;
      } catch (err) {
        console.error('Metrics update error:', err);
        console.error('Error response status:', err.response?.status);
        console.error('Error response data:', err.response?.data);
        console.error('Error response headers:', err.response?.headers);
        
        let errorMessage = 'Metrics update failed. Please try again.';
        if (err.response && err.response.data) {
            const errorData = err.response.data;
            
            if (typeof errorData === 'object' && errorData !== null) {
              errorMessage = Object.entries(errorData)
                  .map(([key, value]) => {
                    // Check if value is an array before using join
                    if (Array.isArray(value)) {
                      return `${key}: ${value.join(', ')}`;
                    } else {
                      return `${key}: ${value}`;
                    }
                  })
                  .join('\n');
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }
        }
        setError(errorMessage);
        throw err;
      }
    };

  // Update user profile information
  const updateProfile = async (profileData) => {
    try {
      setError('');
      // Make sure currentUser exists before patching
      if (!currentUser) {
        await fetchCurrentUser();
        if (!currentUser) {
          throw new Error("User not loaded.");
        }
      }
      
      // Path is correct relative to baseURL which already includes /api
      const response = await api.patch('api/users/profile/', profileData);
      
      // Update stored user data
      const updatedUser = {
        ...currentUser,
        ...response.data // Merge profile update response
      };
      
      setCurrentUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Profile update error:', err);
      let errorMessage = 'Profile update failed. Please try again.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        errorMessage = Object.entries(errorData)
          .map(([key, value]) => {
            // Check if value is an array before using join
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            } else {
              return `${key}: ${value}`;
            }
          })
          .join('\n');
      }
      setError(errorMessage);
      throw err;
    }
  };

  // Rename or create a function to handle both tokens
  const setAuthTokens = (access, refresh) => {
    if (access && refresh) {
      console.log('Setting access and refresh tokens...');
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      // Set the initial Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Add a small delay to ensure the header is set before making API calls
      setTimeout(() => {
      fetchCurrentUser(); 
      }, 100);
    } else {
      console.log('Clearing tokens...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
       // Optionally set currentUser to null here if needed immediately
       setCurrentUser(null); 
    }
  };

  // WebAuthn/Passkey registration
  const registerPasskey = async (name = null) => {
    try {
      setError('');
      
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential || !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        throw new Error('Passkeys are not supported on this device');
      }

      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('Passkeys are not available on this device');
      }

      // Begin registration
      const response = await api.post('api/users/webauthn/register/begin/');
      const options = response.data;

      // Convert base64 strings to ArrayBuffers
      const credentialCreationOptions = {
        challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
        rp: options.rp,
        user: {
          id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
          name: options.user.name,
          displayName: options.user.displayName
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        excludeCredentials: options.excludeCredentials.map(cred => ({
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
          type: cred.type
        })),
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: credentialCreationOptions
      });

      if (!credential) {
        throw new Error('No credential received');
      }

      // Convert ArrayBuffers to base64 for sending to server
      const credentialData = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject)))
        },
        type: credential.type,
        name // Include the name if provided
      };

      // Complete registration
      const completeResponse = await api.post('api/users/webauthn/register/complete/', credentialData);
      
      return completeResponse.data;
    } catch (err) {
      console.error('Passkey registration error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to register passkey';
      setError(errorMessage);
      throw err;
    }
  };

  // Get user's passkeys
  const getPasskeys = async () => {
    try {
      const response = await api.get('api/users/webauthn/credentials/');
      return response.data;
    } catch (err) {
      console.error('Get passkeys error:', err);
      throw err;
    }
  };

  // Delete a passkey
  const deletePasskey = async (credentialId) => {
    try {
      await api.delete(`api/users/webauthn/credentials/${credentialId}/delete/`);
      return true;
    } catch (err) {
      console.error('Delete passkey error:', err);
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    updateMetrics,
    updateProfile,
    setAuthTokens, // Use the new function name
    fetchCurrentUser,
    registerPasskey,
    getPasskeys,
    deletePasskey
  };

  // Render children only when not loading initially, or handle loading state in consumers
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}