import { createGlobalStyle } from 'styled-components';

export const theme = {
  colors: {
    primary: '#4CAF50', // Green for healthy theme
    secondary: '#2196F3', // Blue for accents
    warning: '#FFC107', // Yellow for warnings
    danger: '#F44336', // Red for errors/negative
    neutral: '#607D8B', // Bluish gray for neutral elements
    light: '#F5F5F5', // Light gray for backgrounds
    dark: '#263238', // Dark color for text
    white: '#FFFFFF', // White
  },
  fonts: {
    body: "'Roboto', 'Segoe UI', sans-serif",
    heading: "'Poppins', 'Roboto', sans-serif",
  },
  breakpoints: {
    xs: '480px',
    sm: '768px',
    md: '992px',
    lg: '1200px',
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 4px 8px rgba(0,0,0,0.12)',
    large: '0 8px 16px rgba(0,0,0,0.14)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '16px',
    circle: '50%',
  },
};

export const GlobalStyles = createGlobalStyle`
  /* Import Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html {
    font-size: 16px;
  }
  
  body {
    font-family: ${({ theme }) => theme.fonts.body};
    color: ${({ theme }) => theme.colors.dark};
    background-color: ${({ theme }) => theme.colors.light};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.heading};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-weight: 600;
  }
  
  h1 {
    font-size: 2.25rem;
  }
  
  h2 {
    font-size: 1.75rem;
  }
  
  h3 {
    font-size: 1.5rem;
  }
  
  h4 {
    font-size: 1.25rem;
  }
  
  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover {
      color: ${({ theme }) => theme.colors.secondary};
    }
  }
  
  button {
    cursor: pointer;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.light};
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral};
    border-radius: 5px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary};
  }
  
  /* Mobile optimization */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    html {
      font-size: 14px;
    }
    
    h1 {
      font-size: 1.75rem;
    }
    
    h2 {
      font-size: 1.5rem;
    }
    
    h3 {
      font-size: 1.25rem;
    }
    
    h4 {
      font-size: 1.1rem;
    }
  }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px; /* Preferred icon size */
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;

    /* Support for all WebKit browsers. */
    -webkit-font-smoothing: antialiased;
    /* Support for Safari and Chrome. */
    text-rendering: optimizeLegibility;

    /* Support for Firefox. */
    -moz-osx-font-smoothing: grayscale;

    /* Support for IE. */
    font-feature-settings: 'liga';
  }
`;