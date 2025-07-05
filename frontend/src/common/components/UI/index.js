import styled from 'styled-components';

// Button components
export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  min-height: 44px; /* Minimum touch target size for mobile */
  
  /* Handle variants */
  background-color: ${({ variant, theme }) => 
    variant === 'outline' ? 'transparent' :
    variant === 'text' ? 'transparent' :
    variant === 'secondary' ? theme.colors.secondary : 
    variant === 'danger' ? theme.colors.danger : 
    theme.colors.primary};
  
  color: ${({ variant, theme }) => 
    variant === 'outline' || variant === 'text' ? theme.colors.primary : 
    theme.colors.white};
  
  border: ${({ variant, theme }) => 
    variant === 'outline' ? `1px solid ${theme.colors.primary}` : 'none'};
  
  &:hover {
    background-color: ${({ variant, theme }) => 
      variant === 'outline' ? theme.colors.primary + '10' :
      variant === 'text' ? theme.colors.primary + '10' :
      variant === 'secondary' ? theme.colors.secondary + 'DD' : 
      variant === 'danger' ? theme.colors.danger + 'DD' : 
      theme.colors.primary + 'DD'};
      
    transform: translateY(-1px);
    box-shadow: ${({ theme, variant }) => 
      variant === 'text' ? 'none' : theme.shadows.small};
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: none;
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.neutral}88;
    color: ${({ theme }) => theme.colors.white};
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: none;
  }
  
  svg, span {
    margin-right: ${({ iconOnly }) => iconOnly ? '0' : '0.5rem'};
  }
  
  /* Full width option */
  width: ${({ fullwidth }) => fullwidth ? '100%' : 'auto'};
  
  /* Size variants */
  padding: ${({ size }) => 
    size === 'small' ? '0.5rem 0.75rem' : 
    size === 'large' ? '0.875rem 1.5rem' : 
    '0.625rem 1rem'};
  
  font-size: ${({ size }) => 
    size === 'small' ? '0.875rem' : 
    size === 'large' ? '1.125rem' : 
    '1rem'};
    
  /* Mobile optimizations */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    min-height: 48px; /* Larger touch targets on mobile */
    padding: ${({ size }) => 
      size === 'small' ? '0.625rem 1rem' : 
      size === 'large' ? '1rem 1.75rem' : 
      '0.75rem 1.25rem'};
  }
`;

// Form inputs
export const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme, error }) => error ? theme.colors.danger : theme.colors.neutral}AA;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 1rem;
  background-color: ${({ theme }) => theme.colors.white};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 44px; /* Minimum touch target */
  
  &:focus {
    outline: none;
    border-color: ${({ theme, error }) => error ? theme.colors.danger : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, error }) => error ? theme.colors.danger + '33' : theme.colors.primary + '33'};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.light};
    cursor: not-allowed;
  }
  
  /* Mobile optimizations */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1rem;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 48px;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme, error }) => error ? theme.colors.danger : theme.colors.neutral}AA;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 1rem;
  min-height: 100px;
  background-color: ${({ theme }) => theme.colors.white};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${({ theme, error }) => error ? theme.colors.danger : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, error }) => error ? theme.colors.danger + '33' : theme.colors.primary + '33'};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.light};
    cursor: not-allowed;
  }
  
  /* Mobile optimizations */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1rem;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 120px;
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme, error }) => error ? theme.colors.danger : theme.colors.neutral}AA;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 1rem;
  background-color: ${({ theme }) => theme.colors.white};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  appearance: none;
  min-height: 44px; /* Minimum touch target */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23607D8B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme, error }) => error ? theme.colors.danger : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, error }) => error ? theme.colors.danger + '33' : theme.colors.primary + '33'};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.light};
    cursor: not-allowed;
  }
  
  /* Mobile optimizations */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1rem;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 48px;
  }
`;

// Form group
export const FormGroup = styled.div`
  margin-bottom: 1.25rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    margin-bottom: 1.5rem; /* More space between form groups on mobile */
  }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.dark};
`;

export const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.85rem;
  margin-top: 0.25rem;
  margin-bottom: 0;
`;

// Card component
export const Card = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: ${({ theme }) => theme.shadows.small};
  padding: ${({ theme, padding }) => padding || theme.spacing.lg};
  margin-bottom: ${({ theme, nomargin }) => nomargin ? '0' : theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme, padding }) => padding || theme.spacing.md};
  }
`;

// Container & layout components
export const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 0 ${({ theme }) => theme.spacing.md};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.xs}) {
    padding: 0 ${({ theme }) => theme.spacing.sm};
  }
`;

export const Flex = styled.div`
  display: flex;
  flex-direction: ${({ direction }) => direction || 'row'};
  justify-content: ${({ justify }) => justify || 'flex-start'};
  align-items: ${({ align }) => align || 'stretch'};
  flex-wrap: ${({ wrap }) => wrap || 'nowrap'};
  gap: ${({ gap, theme }) => 
    gap ? (theme.spacing[gap] || gap) : '0'};
    
  /* Mobile optimizations */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: ${({ mobileDirection }) => mobileDirection || 'column'};
    gap: ${({ gap, theme }) => 
      gap ? (theme.spacing[gap] || gap) : theme.spacing.sm};
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: ${({ columns }) => columns || 'repeat(12, 1fr)'};
  grid-gap: ${({ gap, theme }) => 
    gap ? (theme.spacing[gap] || gap) : theme.spacing.md};
    
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: ${({ tabletColumns }) => tabletColumns || 'repeat(6, 1fr)'};
    grid-gap: ${({ gap, theme }) => 
      gap ? (theme.spacing[gap] || gap) : theme.spacing.sm};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: ${({ mobilecolumns, mobileColumns }) => 
      mobilecolumns || mobileColumns || 'repeat(1, 1fr)'};
    grid-gap: ${({ gap, theme }) => 
      gap ? (theme.spacing[gap] || gap) : theme.spacing.sm};
  }
`;

// Spinner component
export const Spinner = styled.div`
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  width: ${({ size }) => size || '24px'};
  height: ${({ size }) => size || '24px'};
  animation: spin 1s linear infinite;
  margin: ${({ center }) => center ? '0 auto' : '0'};
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Typography
export const Title = styled.h1`
  font-size: ${({ size }) => size || '2rem'};
  font-weight: 600;
  margin-bottom: ${({ theme, nomargin }) => nomargin ? '0' : theme.spacing.md};
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
  text-align: ${({ align }) => align || 'left'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: ${({ size }) => 
      size ? `calc(${size} - 0.25rem)` : '1.75rem'};
  }
`;

export const Subtitle = styled.h2`
  font-size: ${({ size }) => size || '1.5rem'};
  font-weight: 500;
  margin-bottom: ${({ theme, nomargin }) => nomargin ? '0' : theme.spacing.md};
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
  text-align: ${({ align }) => align || 'left'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: ${({ size }) => 
      size ? `calc(${size} - 0.25rem)` : '1.25rem'};
  }
`;

export const Text = styled.p`
  font-size: ${({ size }) => size || '1rem'};
  margin-bottom: ${({ theme, nomargin }) => nomargin ? '0' : theme.spacing.md};
  color: ${({ theme, color }) => color ? theme.colors[color] : theme.colors.dark};
  text-align: ${({ align }) => align || 'left'};
  line-height: 1.5;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: ${({ size }) => 
      size ? `calc(${size} - 0.125rem)` : '0.9375rem'};
  }
`;

// Badge component
export const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme, pill }) => pill ? '50px' : theme.borderRadius.small};
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${({ theme, variant }) => 
    theme.colors[variant] || theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
`;

// Divider component
export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme, color }) => 
    color ? theme.colors[color] : theme.colors.neutral}33;
  margin: ${({ theme, margin }) => margin || `${theme.spacing.md} 0`};
`;

// Responsive helpers
export const Hide = styled.div`
  @media (max-width: ${({ theme, below }) => theme.breakpoints[below]}) {
    display: ${({ below }) => below ? 'none' : 'inherit'};
  }
  
  @media (min-width: ${({ theme, above }) => theme.breakpoints[above]}) {
    display: ${({ above }) => above ? 'none' : 'inherit'};
  }
`;