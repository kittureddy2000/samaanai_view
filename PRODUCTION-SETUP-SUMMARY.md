# 🚀 Production Setup Summary - Cost-Optimized

## 💰 **Monthly Cost: ~$7-10** (Perfect for Personal Projects)

### What You Get:
- **Cloud SQL Database**: `db-f1-micro` (~$7/month)
- **Cloud Storage**: FREE tier (5GB)
- **Cloud Run**: FREE tier (2M requests/month)
- **All other services**: FREE tier

---

## 🎯 **One-Command Setup**

### Prerequisites (5 minutes):
```bash
# 1. Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# 2. Login to Google Cloud
gcloud auth login
gcloud auth application-default login

# 3. Set your project ID
export PROJECT_ID=your-actual-project-id
```

### Run the Setup Script:
```bash
# This handles 90% of the setup automatically
./setup-production.sh
```

**What the script does automatically:**
- ✅ Enables all required Google Cloud APIs
- ✅ Creates minimal cost Cloud SQL instance
- ✅ Creates FREE tier storage bucket
- ✅ Creates service account with minimal permissions
- ✅ Generates and stores secrets
- ✅ Creates Artifact Registry repository
- ✅ Sets up CORS and lifecycle policies

---

## 🔴 **Manual Steps (20 minutes total)**

After running the script, you need to do these 4 things manually:

### 1. Google OAuth Setup (5 minutes)
- Go to: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID
- Add redirect URI: `https://your-backend-service.run.app/api/auth/social/complete/google-oauth2/`
- Copy Client ID and Secret to Secret Manager

### 2. Custom Domain Setup (10 minutes)
- Go to: https://console.cloud.google.com/run
- Select your frontend service
- Click "Manage Custom Domains"
- Add `samaanai.com`
- Update DNS with provided records

### 3. Plaid Production Keys (5 minutes)
- Go to: https://dashboard.plaid.com/team/keys
- Switch to Production environment
- Copy production keys
- Update Secret Manager

### 4. SendGrid Account (Optional)
- Create free account at sendgrid.com
- Get API key for email notifications

---

## 🚀 **Deploy Your Application**

```bash
# Deploy backend
gcloud builds submit --config cloudbuild-backend.yaml

# Deploy frontend
gcloud builds submit --config cloudbuild-frontend.yaml
```

---

## 📊 **Cost Breakdown**

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| Cloud SQL (db-f1-micro) | 24/7 | ~$7.00 |
| Cloud Storage | <5GB | FREE |
| Cloud Run | <2M requests | FREE |
| Secret Manager | <6 secrets | FREE |
| Cloud Build | <120 min/day | FREE |
| **Total** | | **~$7-10** |

---

## ✅ **What Makes This Cost-Optimized**

1. **Smallest Database**: `db-f1-micro` instead of larger instances
2. **Cheapest Region**: `us-central1` instead of premium regions
3. **HDD Storage**: Instead of expensive SSD
4. **No Backups**: Saves ~$2/month (you can enable later)
5. **FREE Tier Everything Else**: Storage, Cloud Run, Secret Manager
6. **Lifecycle Policies**: Auto-delete old files to save storage costs

---

## 🎉 **Result**

You'll have a **production-ready Django-React application** running on Google Cloud for the cost of a coffee per month!

The setup script handles all the complex configuration automatically, and you only need to do 4 simple manual steps in the Google Console.

Perfect for personal projects that need professional deployment without enterprise costs. 