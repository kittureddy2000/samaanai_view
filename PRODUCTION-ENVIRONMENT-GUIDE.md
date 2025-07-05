# Production Environment Configuration Guide

## Overview
This guide covers **minimal-cost** production deployment for your Samaanai Django-React application on Google Cloud, optimized for personal projects with budget constraints.

## 💰 **Cost-Optimized Architecture**

### Free Tier & Minimal Cost Services
- **Cloud Run**: 2 million requests/month FREE
- **Cloud SQL**: `db-f1-micro` instance (~$7/month)
- **Cloud Storage**: 5GB FREE, then $0.02/GB
- **Secret Manager**: 6 secret versions FREE/month
- **Cloud Build**: 120 build-minutes/day FREE

### Monthly Cost Estimate: **~$7-12/month**

## 🔧 Environment Variables Review

### Required Environment Variables for Production

#### Core Django Settings
```bash
# Required - Django Security
SECRET_KEY=your-super-secret-production-key-here
DEBUG=False
ENVIRONMENT=production

# Required - Project Configuration
PROJECT_ID=your-gcp-project-id
ALLOWED_HOSTS=your-domain.com,your-backend-url.run.app
FRONTEND_URL=https://samaanai.com  # Your custom domain
CORS_ALLOWED_ORIGINS=https://samaanai.com
CSRF_TRUSTED_ORIGINS=https://samaanai.com

# Required - Database Configuration (MINIMAL COST)
POSTGRES_DB=samaanai_production
POSTGRES_USER=samaanai_user
DB_PASSWORD=your-secure-database-password
DB_HOST=/cloudsql/your-project:region:instance-name
DB_PORT=5432

# Required - Google Cloud Storage (FREE TIER)
GS_BUCKET_NAME=your-project-static-files
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}

# Required - OAuth & Authentication
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
CLOUDRUN_SERVICE_URL=https://your-backend-service.run.app

# Required - Plaid Integration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET_PRODUCTION=your-plaid-production-secret
PLAID_ENV=production
PLAID_WEBHOOK_URL=https://your-backend-service.run.app/api/finance/webhooks/plaid/

# Optional - Email Configuration (FREE TIER)
SENDGRID_API_KEY=your-sendgrid-api-key  # 100 emails/day FREE
DEFAULT_FROM_EMAIL=noreply@samaanai.com
```

#### Frontend Environment Variables
```bash
# React App Configuration
REACT_APP_API_URL=https://your-backend-service.run.app
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### Current Configuration Issues & Recommendations

#### 1. Missing Static Files Configuration
**Issue**: Your `settings.py` is missing static file URL and root configurations.

**Fix**: Add these settings to your `backend/samaanai/settings.py`:

```python
# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Static files finders
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

# Additional static files directories
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
```

#### 2. Environment Variable Management
**Issue**: No `.env.example` template file for easy setup.

**Fix**: Create environment variable templates and improve secret management.

#### 3. Database Configuration Improvements
**Issue**: Database connection handling could be more robust.

**Fix**: Enhanced database configuration with connection pooling and SSL.

## 🗄️ **Minimal Cost Database Configuration**

### Cloud SQL Setup (Optimized for Cost)

#### 1. Smallest Instance Configuration
```bash
# Create MINIMAL cost PostgreSQL instance
gcloud sql instances create samaanai-postgres \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \              # CHEAPEST tier (~$7/month)
    --region=us-central1 \             # Cheapest region
    --storage-type=HDD \               # Cheaper than SSD
    --storage-size=10GB \              # Minimum size
    --no-backup \                      # Skip backups to save cost
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04
```

#### 2. Cost-Saving Database Options
```bash
# Alternative: Use Cloud SQL Proxy for connection pooling
# This reduces connection overhead and costs

# For even lower costs, consider:
# - Shared-core instances instead of dedicated
# - Regional persistent disks
# - Automated storage increase disabled
```

## 📁 **Free Tier Static File Storage**

### Google Cloud Storage (Free Tier)
```bash
# Create bucket in cheapest region
gsutil mb -c STANDARD -l us-central1 gs://samaanai-static-files

# Set lifecycle policy to delete old versions
gsutil lifecycle set lifecycle.json gs://samaanai-static-files
```

## 🚀 **What the Setup Script Automates vs Manual Steps**

### ✅ **Fully Automated by Script**
- ✅ Enable all required Google Cloud APIs
- ✅ Create Cloud SQL instance with minimal cost settings
- ✅ Create storage bucket with proper permissions
- ✅ Create service account with minimal required permissions
- ✅ Generate and store secrets in Secret Manager
- ✅ Create Artifact Registry repository
- ✅ Set up CORS policies for storage

### ⚠️ **Requires Manual Setup (Google Console)**
- 🔴 **OAuth Credentials**: Google Console → APIs & Services → Credentials
- 🔴 **Custom Domain**: Cloud Run → Manage Custom Domains
- 🔴 **Plaid Production Keys**: Plaid Dashboard → API Keys
- 🔴 **SendGrid Account**: SendGrid.com → Free Account Setup

## 📋 **Updated Production Checklist (Cost-Optimized)**

### Environment Variables (Automated ✅)
- [x] All required environment variables set in Secret Manager
- [x] Database credentials configured
- [x] Google Cloud Storage bucket created and configured
- [ ] OAuth credentials updated for production domains (**MANUAL**)
- [ ] Plaid credentials set to production environment (**MANUAL**)

### Database (Mostly Automated ✅)
- [x] Cloud SQL `db-f1-micro` instance created (~$7/month)
- [x] Database and user created
- [x] Connection string configured
- [x] Minimal cost settings applied
- [ ] Test database connection (**VERIFY**)

### Static Files (Automated ✅)
- [x] Google Cloud Storage bucket created (FREE tier)
- [x] Service account permissions configured
- [x] CORS policy applied
- [x] Lifecycle policy for cost optimization

### Security (Automated ✅)
- [x] DEBUG set to False
- [x] Strong SECRET_KEY generated
- [x] Security headers configured
- [x] CORS properly configured
- [ ] Custom domain HTTPS setup (**MANUAL**)

### Deployment (Mostly Automated ✅)
- [x] Cloud Build configuration ready
- [x] Artifact Registry repository created
- [x] Service account permissions set
- [ ] Initial deployment trigger (**MANUAL**)

## 🛠️ **Running the Production Setup Script**

### Prerequisites
```bash
# 1. Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 2. Authenticate
gcloud auth login
gcloud auth application-default login

# 3. Set your project ID
export PROJECT_ID=your-actual-project-id
```

### Run the Setup Script
```bash
# The script will handle EVERYTHING except manual OAuth setup
./setup-production.sh

# Follow prompts:
# - Confirm project ID
# - Enter secure database password
# - Review created resources
```

### What Happens Automatically
1. **APIs Enabled**: All required Google Cloud services
2. **Database Created**: Minimal cost Cloud SQL instance
3. **Storage Setup**: Free tier bucket with proper permissions
4. **Security**: Service account and secrets created
5. **Build Pipeline**: Artifact Registry ready for deployments

## 🔴 **Manual Steps After Script (Required)**

### 1. Google OAuth Setup (5 minutes)
```bash
# Go to: https://console.cloud.google.com/apis/credentials
# 1. Create OAuth 2.0 Client ID
# 2. Add authorized redirect URIs:
#    - https://your-backend-service.run.app/api/auth/social/complete/google-oauth2/
# 3. Copy Client ID and Secret to Secret Manager
```

### 2. Custom Domain Setup (10 minutes)
```bash
# Go to: https://console.cloud.google.com/run
# 1. Select your frontend service
# 2. Click "Manage Custom Domains"
# 3. Add samaanai.com
# 4. Update DNS with provided records
```

### 3. Plaid Production Keys (5 minutes)
```bash
# Go to: https://dashboard.plaid.com/team/keys
# 1. Switch to Production environment
# 2. Copy production keys
# 3. Update Secret Manager with production keys
```

## 💡 **Cost Optimization Tips**

### 1. Database Cost Reduction
```bash
# Use connection pooling to reduce database connections
# Set shorter connection timeouts
# Consider pausing database during low usage (manual)
```

### 2. Cloud Run Optimization
```bash
# Set minimum instances to 0 (cold starts acceptable)
# Use smaller memory allocation (512MB)
# Set request timeout to 60 seconds
# Enable CPU throttling when not serving requests
```

### 3. Storage Cost Management
```bash
# Enable object lifecycle management
# Delete old static file versions automatically
# Use Standard storage class (cheapest)
```

## 🚀 **Deployment Commands**

### Initial Deployment
```bash
# 1. Run setup script
./setup-production.sh

# 2. Deploy backend
gcloud builds submit --config cloudbuild-backend.yaml

# 3. Deploy frontend  
gcloud builds submit --config cloudbuild-frontend.yaml

# 4. Set up custom domain (manual in console)
```

### Ongoing Deployments
```bash
# Backend updates
git push origin main  # Triggers Cloud Build automatically

# Frontend updates  
git push origin main  # Triggers Cloud Build automatically
```

## 📊 **Monthly Cost Breakdown**

| Service | Usage | Cost |
|---------|-------|------|
| Cloud SQL (db-f1-micro) | 24/7 | ~$7.00 |
| Cloud Storage | <5GB | FREE |
| Cloud Run | <2M requests | FREE |
| Secret Manager | <6 secrets | FREE |
| Cloud Build | <120 min/day | FREE |
| **Total** | | **~$7-10/month** |

## 🔍 **Verification Commands**

### Test Your Deployment
```bash
# 1. Check database connection
gcloud sql connect samaanai-postgres --user=samaanai_user

# 2. Test backend API
curl -f https://your-backend-service.run.app/api/users/profile/

# 3. Test frontend
curl -f https://samaanai.com

# 4. Check static files
curl -f https://storage.googleapis.com/your-bucket/static/admin/css/base.css
```

## 🆘 **Troubleshooting**

### Common Issues
1. **"Permission denied"**: Run `gcloud auth login` again
2. **"Project not found"**: Verify `PROJECT_ID` environment variable
3. **"Database connection failed"**: Check Cloud SQL proxy configuration
4. **"Static files not loading"**: Verify bucket permissions and CORS

### Quick Fixes
```bash
# Reset authentication
gcloud auth revoke --all
gcloud auth login
gcloud auth application-default login

# Check project configuration
gcloud config list

# Verify services are enabled
gcloud services list --enabled
```

This setup gives you a **production-ready application for ~$7/month** with room to scale as your personal project grows! 