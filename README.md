# Samaanai - Personal Finance & Nutrition Tracker

A comprehensive personal finance and nutrition tracking application built with Django REST Framework and React.

## Features

### Finance App
- **Bank Account Integration**: Connect multiple bank accounts via Plaid
- **Transaction Management**: Automatically sync and categorize transactions
- **Investment Tracking**: Monitor stock holdings and performance
- **Custom Categories**: Set personal spending categories
- **Analytics Dashboard**: Visual spending insights and trends
- **OAuth Support**: Works with Chase and other OAuth institutions

### Nutrition App
- **Food Logging**: Track meals and nutrition intake
- **Calorie Counting**: Monitor daily caloric consumption
- **Nutritional Analysis**: Detailed breakdown of macros and nutrients

## Development Setup

### Prerequisites
- Docker and Docker Compose
- OpenSSL (for HTTPS certificates)

### Quick Start (HTTP)
```bash
# Clone the repository
git clone <repository-url>
cd Samaanai_view

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development servers
docker-compose up --build
```

### HTTPS Development Setup (Required for Chase OAuth)

For testing OAuth institutions like Chase Bank, you need HTTPS:

```bash
# Generate SSL certificates for localhost
./scripts/generate-ssl-certs.sh

# Start HTTPS development environment
./scripts/dev-https.sh

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.https.yml up --build
```

**Access Points:**
- **Frontend**: https://localhost
- **Backend API**: https://localhost/api
- **Django Admin**: https://localhost/admin

**Important**: Your browser will show a security warning for self-signed certificates. Click "Advanced" → "Proceed to localhost (unsafe)" to continue.

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
POSTGRES_DB=samaanai_dev
POSTGRES_USER=testuser
POSTGRES_PASSWORD=testpass123

# Django
SECRET_KEY=your-secret-key
DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Plaid Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET_SANDBOX=your_plaid_sandbox_secret
PLAID_SECRET_PRODUCTION=your_plaid_production_secret
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=https://your-domain.com/api/finance/webhooks/plaid/

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL (important for OAuth)
FRONTEND_URL=https://localhost  # Use https:// for OAuth testing
```

## OAuth Institution Testing

### Chase Bank Integration

Chase requires OAuth authentication, which needs HTTPS:

1. **Development**: Use the HTTPS setup above
2. **Production**: Ensure your domain has a valid SSL certificate

**Why HTTPS is Required:**
- Plaid only allows OAuth redirect URIs with HTTPS
- Chase and other major banks require secure OAuth flows
- Enhanced security for financial data

### Supported OAuth Institutions
- Chase Bank
- Bank of America (some accounts)
- Wells Fargo (select products)
- Many credit unions

### Non-OAuth Institutions
These work with HTTP in development:
- Community banks
- Smaller regional banks
- Some credit unions

## Docker Services

### Regular Development
```bash
# Start all services
docker-compose up

# Backend only
docker-compose up backend db

# Frontend only  
docker-compose up frontend
```

### HTTPS Development
```bash
# Full HTTPS stack
docker-compose -f docker-compose.yml -f docker-compose.https.yml up

# With rebuild
docker-compose -f docker-compose.yml -f docker-compose.https.yml up --build
```

## Testing

### Comprehensive Test Suite
```bash
# Run all tests with coverage
npm run test:all

# Run specific app tests
npm run test:nutrition
npm run test:finance

# Run with Docker
./docker-test.sh
```

### Test Options
1. **Quick Tests**: Essential tests only
2. **Full Test Suite**: All tests with coverage
3. **Individual Apps**: Test specific functionality
4. **Docker Tests**: Isolated test environment
5. **CI/CD Tests**: Production-like testing

## API Documentation

### Finance Endpoints
- `GET /api/finance/dashboard/` - Dashboard data
- `GET /api/finance/accounts/` - Bank accounts
- `GET /api/finance/transactions/` - Transaction history
- `POST /api/finance/institutions/` - Add new institution
- `GET /api/finance/holdings/` - Investment holdings

### Authentication
- `POST /api/auth/login/` - Login
- `POST /api/auth/register/` - Register
- `POST /api/auth/google/` - Google OAuth

## Security Features

### HTTPS Configuration
- Self-signed certificates for development
- Proper SSL headers via NGINX reverse proxy
- Secure cookie settings for production

### Financial Data Protection
- Encrypted Plaid tokens
- Secure OAuth flows
- CORS protection
- CSRF protection

## Troubleshooting

### Chase OAuth Issues
1. **"Your account settings are incompatible"**
   - This means Chase requires OAuth
   - Use HTTPS development setup
   - Check MFA settings in Chase account

2. **Certificate Warnings**
   - Normal for self-signed certificates
   - Click "Advanced" → "Proceed to localhost"
   - Or add certificate to system trust store

3. **OAuth Redirect Errors**
   - Ensure `FRONTEND_URL=https://localhost` in .env
   - Verify SSL certificates are generated
   - Check that OAuth callback route exists

### General Issues
1. **Port Conflicts**
   ```bash
   docker-compose down
   docker system prune -f
   ```

2. **Database Issues**
   ```bash
   docker-compose down -v  # Removes volumes
   docker-compose up --build
   ```

3. **Frontend Hot Reload**
   ```bash
   # Ensure proper bind mount in docker-compose.yml
   volumes:
     - ./frontend:/app
     - /app/node_modules
   ```

## Production Deployment

### Environment Setup
- Use production database (PostgreSQL/MySQL)
- Set `DEBUG=False`
- Configure proper SSL certificates
- Set strong `SECRET_KEY`
- Use production Plaid environment

### Security Checklist
- [ ] HTTPS certificate from trusted CA
- [ ] Secure environment variables
- [ ] Database encryption
- [ ] Regular security updates
- [ ] Backup strategy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
