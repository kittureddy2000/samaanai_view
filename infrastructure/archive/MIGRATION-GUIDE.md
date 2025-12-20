# 🔄 Migration Guide: Existing Deployment → Cost-Optimized Setup

## 🎯 **Your Situation:**
- ✅ Existing Cloud Run services deployed
- ✅ Existing database (but no important data)
- ✅ **Existing secrets in Secret Manager** (KEEP THESE!)
- ✅ Want to optimize for minimal cost (~$7/month)
- **Project**: using-ai-405105 (1074693546571)

## 📋 **Migration Strategy (Updated for Your Setup)**

### Step 1: Backup Current Configuration (5 minutes)
```bash
# Set your project (you already know this)
export PROJECT_ID=using-ai-405105

# List your current services
gcloud run services list --format="table(metadata.name,status.url,spec.template.spec.containers[0].image)"

# List your current database
gcloud sql instances list

# Your secrets are already in Secret Manager - we'll keep them!
gcloud secrets list
```

### Step 2: Delete Existing Database ONLY (2 minutes)
```bash
# Delete the existing database (since no important data)
# First, find your current database name:
gcloud sql instances list

# Then delete it (replace with your actual instance name):
gcloud sql instances delete your-current-instance-name

# This will save you money immediately by stopping the old instance
```

### Step 3: Run Cost-Optimized Setup (10 minutes)
```bash
# Set your project ID
export PROJECT_ID=using-ai-405105

# Run the automated setup
./setup-production.sh

# The script will:
# ✅ Skip creating existing secrets (keeps your current ones)
# ✅ Create new db-f1-micro database (~$7/month)
# ✅ Create optimized storage bucket
# ✅ Create service account (if needed)
# ✅ Set up proper permissions
```

### Step 4: Update Existing Cloud Run Services (5 minutes)
```bash
# Update backend service with new database connection
# (Replace 'your-backend-service' with your actual service name)
gcloud run services update your-backend-service \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest" \
  --set-secrets="SECRET_KEY=SECRET_KEY:latest" \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=GOOGLE_APPLICATION_CREDENTIALS:latest" \
  --set-env-vars="DB_HOST=/cloudsql/using-ai-405105:us-central1:samaanai-postgres"

# Update frontend service (if needed)
gcloud run services update your-frontend-service \
  --set-env-vars="REACT_APP_API_URL=https://your-backend-service.run.app"
```

### Step 5: Run Database Migrations (2 minutes)
```bash
# Connect to your backend service and run migrations
gcloud run services proxy your-backend-service --port=8080 &
curl -X POST http://localhost:8080/admin/migrate/  # If you have a migration endpoint

# Or deploy a new version that runs migrations automatically
```

## 🎯 **Alternative: Complete Fresh Deployment**

If you want to start completely fresh:

```bash
# 1. Delete everything EXCEPT secrets
gcloud run services delete your-backend-service
gcloud run services delete your-frontend-service
gcloud sql instances delete your-current-instance-name
# Keep your secrets in Secret Manager!

# 2. Run setup script
./setup-production.sh

# 3. Deploy fresh
gcloud builds submit --config cloudbuild-backend.yaml
gcloud builds submit --config cloudbuild-frontend.yaml
```

## 🔐 **Secret Manager Strategy**

### ✅ **KEEP These Secrets (Already Perfect):**
- `SECRET_KEY` - Your Django secret key
- `DB_PASSWORD` - Database password (will work with new DB)
- `GOOGLE_CLIENT_ID` - OAuth credentials
- `GOOGLE_CLIENT_SECRET` - OAuth credentials  
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account key
- `SENDGRID_API_KEY` - Email service
- `EMAIL_HOST_PASSWORD` - Email configuration
- `REDIRECT_URI` - OAuth redirect

### 🆕 **Only Missing (Script Will Add):**
- `PLAID_CLIENT_ID` - If you want Plaid integration
- `PLAID_SECRET_PRODUCTION` - If you want Plaid integration

## 💰 **Cost Comparison**

### Before (Typical Setup):
- Database: `db-n1-standard-1` (~$25/month)
- Storage: Premium SSD (~$10/month)
- **Total: ~$35/month**

### After (Cost-Optimized):
- Database: `db-f1-micro` (~$7/month)
- Storage: FREE tier
- **Total: ~$7/month**

**Savings: ~$28/month = $336/year**

## ✅ **Recommended Migration Steps for Your Setup**

1. **Keep your existing secrets** (they're already configured perfectly!)
2. **Delete existing database** (no important data)
3. **Run `./setup-production.sh`** (will skip existing secrets)
4. **Update Cloud Run services** (point to new database)
5. **Test everything works**
6. **Your OAuth/domain setup is already done!**

## 🔍 **Verification Commands**

```bash
# Check new database is running
gcloud sql instances list

# Check services are updated
gcloud run services list

# Test backend API
curl -f https://your-backend-service.run.app/api/health/

# Check cost optimization
gcloud sql instances describe samaanai-postgres --format="value(settings.tier,settings.storageType)"
# Should show: db-f1-micro, HDD

# Verify secrets are still there
gcloud secrets list
```

## 🎉 **Result**

You'll have the same functionality but **optimized for minimal cost** with proper production configuration.

**Advantage**: Since your secrets are already set up, you'll skip most of the manual OAuth/domain configuration steps! 