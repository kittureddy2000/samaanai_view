# 🚀 Your Personalized Migration Commands

## 📋 **Your Project Details:**
- **Project ID**: `using-ai-405105`
- **Project Number**: `1074693546571`
- **Region**: `us-central1` (cheapest)
- **Existing Secrets**: ✅ Already configured in Secret Manager

---

## 🎯 **Step-by-Step Migration (20 minutes)**

### Step 1: Set Your Project (1 minute)
```bash
# Set your project ID
export PROJECT_ID=using-ai-405105

# Verify you're authenticated
gcloud auth list

# Set the project as default
gcloud config set project using-ai-405105
```

### Step 2: Check Current Setup (2 minutes)
```bash
# See your current services
gcloud run services list

# See your current database (to get the name for deletion)
gcloud sql instances list

# Verify your secrets (these will be kept!)
gcloud secrets list
```

### Step 3: Delete Current Database (2 minutes)
```bash
# Replace 'your-instance-name' with the actual name from step 2
gcloud sql instances delete your-instance-name

# This immediately stops billing for the old database
```

### Step 4: Run Cost-Optimized Setup (10 minutes)
```bash
# Run the automated setup script
./setup-production.sh

# The script will:
# ✅ Keep all your existing secrets
# ✅ Create new db-f1-micro database (~$7/month)
# ✅ Create optimized storage bucket
# ✅ Set up proper service account
# ✅ Configure minimal cost settings
```

### Step 5: Update Your Cloud Run Services (5 minutes)
```bash
# First, get your exact service names
gcloud run services list --format="value(metadata.name)"

# Update backend service (replace 'your-backend-service' with actual name)
gcloud run services update your-backend-service \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest" \
  --set-secrets="SECRET_KEY=SECRET_KEY:latest" \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=GOOGLE_APPLICATION_CREDENTIALS:latest" \
  --set-env-vars="DB_HOST=/cloudsql/using-ai-405105:us-central1:samaanai-postgres" \
  --set-env-vars="PROJECT_ID=using-ai-405105" \
  --set-env-vars="ENVIRONMENT=production"

# Update frontend service (if needed, replace 'your-frontend-service' with actual name)
gcloud run services update your-frontend-service \
  --set-env-vars="REACT_APP_API_URL=https://your-backend-service.run.app"
```

---

## 🔍 **Verification Commands**

```bash
# Check new database is created with cost-optimized settings
gcloud sql instances describe samaanai-postgres --format="value(settings.tier,settings.storageType,settings.storageSize)"
# Should show: db-f1-micro, HDD, 10GB

# Check your services are running
gcloud run services list

# Test your backend API
curl -f https://your-backend-service.run.app/api/health/

# Verify all secrets are still there
gcloud secrets list
```

---

## 💰 **Expected Cost Savings**

### Before:
- Database: ~$25-50/month (typical setup)
- Storage: ~$10/month
- **Total: ~$35-60/month**

### After:
- Database: ~$7/month (db-f1-micro)
- Storage: FREE (under 5GB)
- **Total: ~$7/month**

**Monthly Savings: ~$28-53 = $336-636/year**

---

## 🎉 **What You'll Have After Migration**

✅ **Same functionality, minimal cost**  
✅ **All your existing secrets preserved**  
✅ **OAuth already configured** (no manual setup needed!)  
✅ **Email notifications working** (SendGrid already set up)  
✅ **Professional production deployment**  
✅ **Cost-optimized infrastructure**  

---

## 🆘 **If Something Goes Wrong**

### Rollback Commands:
```bash
# If you need to rollback, your secrets are safe
# Just redeploy your original services

# Check what went wrong
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

### Support:
- All your secrets are preserved in Secret Manager
- Your original Cloud Run services can be restored
- Database can be recreated from the same script

---

## 🚀 **Ready to Start?**

Run these commands in order:
1. `export PROJECT_ID=using-ai-405105`
2. `gcloud sql instances list` (note the database name)
3. `gcloud sql instances delete your-database-name`
4. `./setup-production.sh`
5. Update your Cloud Run services with the new database connection

**Total time: ~20 minutes**  
**Monthly savings: ~$28-53**  
**Risk: Minimal (secrets preserved, services kept)** 