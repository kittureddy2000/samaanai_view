import { createGlobalStyle } from 'styled-components';

// Premium Modern Theme
export const theme = {
  colors: {
    primary: '#6366f1', // Indigo 500 - Modern, vibrant primary
    primaryDark: '#4f46e5', // Indigo 600
    primaryLight: '#818cf8', // Indigo 400
    secondary: '#ec4899', // Pink 500 - Vibrant accent
    success: '#10b981', // Emerald 500
    warning: '#f59e0b', // Amber 500
    danger: '#ef4444', // Red 500
    info: '#06b6d4', // Cyan 500

    // Neutrals for Glassmorphism
    background: '#0f0f1a', // Dark background
    surface: '#1a1a2e',
    text: {
      primary: '#1e293b', // Slate 800
      secondary: '#64748b', // Slate 500
      disabled: '#94a3b8', // Slate 400
    },
    border: '#e2e8f0', // Slate 200

    // Backward compatibility aliases
    white: '#ffffff',
    dark: '#1e293b',
    light: '#f1f5f9',
    neutral: '#64748b',
  },
  // Spacing system
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  fonts: {
    body: "'Inter', sans-serif",
    heading: "'Plus Jakarta Sans', sans-serif",
    mono: "'Fira Code', monospace",
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    // Backward compatibility aliases
    small: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  // Backward compatibility alias for borderRadius
  borderRadius: {
    small: '0.375rem',
    medium: '0.5rem',
    large: '0.75rem',
  },
  transitions: {
    default: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    heroAlt: 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f59e0b 100%)',
    card: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    dark: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    finance: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
  },
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  animations: {
    fadeIn: 'fadeIn 0.3s ease-out',
    slideUp: 'slideUp 0.4s ease-out',
    pulse: 'pulse 2s infinite',
  }
};

export const GlobalStyles = createGlobalStyle`
  /* Import Google Fonts: Inter and Plus Jakarta Sans */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&family=Fira+Code&display=swap');
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html {
    font-size: 16px;
    height: 100%;
  }
  
  body {
    font-family: ${({ theme }) => theme.fonts.body};
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ theme }) => theme.colors.background};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
    overflow: hidden; /* App-like feel */
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.heading};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 1rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  
  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-bottom: 1rem;
  }
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: ${({ theme }) => theme.transitions.default};
    
    &:hover {
      color: ${({ theme }) => theme.colors.primaryDark};
    }
  }
  
  button {
    cursor: pointer;
  }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.text.disabled};
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.secondary};
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