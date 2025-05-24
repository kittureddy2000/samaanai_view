console.log('=== DEBUG: Environment Variables ===');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All REACT_APP_ vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Log the constructed social auth URL like in Login.js
let baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
if (baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.slice(0, -4);
}
const socialAuthUrl = `${baseUrl}/api/auth/social/login/google-oauth2/`;
console.log('Constructed socialAuthUrl:', socialAuthUrl); 