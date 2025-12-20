import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming your main component is App.js

// Find the root element in your public/index.html
const rootElement = document.getElementById('root');

// Create a root concurrent mode instance
const root = ReactDOM.createRoot(rootElement);

// Render the App component into the root element
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
