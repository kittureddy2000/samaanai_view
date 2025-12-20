# GitHub Actions Deployment Setup

This guide explains how to set up GitHub Actions for deploying to Google Cloud Run.

## Your GCP Projects

| Project ID | Name | Purpose |
|------------|------|---------|
| `samaanai-prod-1009-124126` | SamaanAi Production | Production environment |
| `samaanai-stg-1009-124126` | SamaanAi Staging | Staging environment |

---

## Step 1: Enable Required APIs

Run for **both** projects:

```bash
# Production
gcloud config set project samaanai-prod-1009-124126
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iamcredentials.googleapis.com

# Staging
gcloud config set project samaanai-stg-1009-124126
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iamcredentials.googleapis.com
```

---

## Step 2: Create Artifact Registry

```bash
# Production
gcloud config set project samaanai-prod-1009-124126
gcloud artifacts repositories create samaanai \
  --repository-format=docker \
  --location=us-central1

# Staging  
gcloud config set project samaanai-stg-1009-124126
gcloud artifacts repositories create samaanai \
  --repository-format=docker \
  --location=us-central1
```

---

## Step 3: Set Up Workload Identity Federation

This allows GitHub Actions to authenticate to GCP **without** storing service account keys.

Run for **production** project (repeat for staging with different pool/provider names):

```bash
PROJECT_ID=samaanai-prod-1009-124126
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create Service Account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Deployer"

# Grant necessary roles to the service account
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub Actions to impersonate the service account
# Replace YOUR_GITHUB_ORG/YOUR_REPO with your actual repo
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_ORG/YOUR_REPO"
```

---

## Step 4: Create Secrets in Secret Manager

```bash
PROJECT_ID=samaanai-prod-1009-124126
gcloud config set project $PROJECT_ID

# Generate a new Django secret key
echo -n "$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')" | \
  gcloud secrets create SECRET_KEY --data-file=-

# Database URL (replace with your Cloud SQL connection)
echo -n "postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Plaid credentials
echo -n "YOUR_PLAID_CLIENT_ID" | gcloud secrets create PLAID_CLIENT_ID --data-file=-
echo -n "YOUR_PLAID_SECRET" | gcloud secrets create PLAID_SECRET --data-file=-

# Encryption key
echo -n "YOUR_FIELD_ENCRYPTION_KEY" | gcloud secrets create FIELD_ENCRYPTION_KEY --data-file=-
```

---

## Step 5: Add GitHub Repository Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-actions@PROJECT_ID.iam.gserviceaccount.com` |
| `CLOUD_SQL_INSTANCE` | `PROJECT_ID:us-central1:INSTANCE_NAME` |
| `BACKEND_URL` | `https://samaanai-backend-XXXXX-uc.a.run.app` (after first deploy) |
| `CUSTOM_DOMAIN` | Your custom domain (optional) |

> **Note**: Create separate environments in GitHub (Settings → Environments) for `production` and `staging` with their respective secrets.

---

## Step 6: Deploy

1. **Push to `main`** → Deploys to production
2. **Push to `staging`** → Deploys to staging
3. **Manual trigger** → Go to Actions tab and run workflow manually

---

## Troubleshooting

### "Permission denied" errors
- Ensure the service account has all required roles
- Check that Workload Identity is configured correctly

### "Image not found" errors
- Ensure Artifact Registry repository exists
- Check that docker auth is configured

### Database connection issues
- Verify Cloud SQL instance name in `CLOUD_SQL_INSTANCE` secret
- Ensure `--add-cloudsql-instances` flag is set correctly
