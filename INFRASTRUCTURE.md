# Production Infrastructure - Samaanai Finance

## Project Details

| Resource | Value |
|----------|-------|
| **GCP Project ID** | `samaanai-prod-1009-124126` |
| **Project Number** | `172298808029` |
| **Region** | `us-central1` (Cloud Run) / `us-west1` (Cloud SQL) |

---

## Cloud SQL

| Resource | Value |
|----------|-------|
| **Instance Name** | `samaanai-prod-postgres` |
| **Database Version** | PostgreSQL 15 |
| **Database Name** | `samaanai_finance` |
| **Database User** | `finance_user` |
| **Password** | `tX4oM6JkVrm-7_WZwuFXcsVIxv5_wGkQ` |
| **Connection Name** | `samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres` |

---

## Secret Manager

All secrets are prefixed with `FINANCE_`:

| Secret Name | Description |
|-------------|-------------|
| `FINANCE_SECRET_KEY` | Django secret key |
| `FINANCE_DATABASE_URL` | Cloud SQL connection string |
| `FINANCE_PLAID_CLIENT_ID` | Plaid client ID |
| `FINANCE_PLAID_SECRET` | Plaid secret (production) |
| `FINANCE_PLAID_ENCRYPTION_KEY` | Fernet key for Plaid token encryption |

---

## Artifact Registry

| Resource | Value |
|----------|-------|
| **Repository** | `samaanai` |
| **Location** | `us-central1` |
| **Full Path** | `us-central1-docker.pkg.dev/samaanai-prod-1009-124126/samaanai` |

---

## Workload Identity Federation (GitHub Actions)

| Resource | Value |
|----------|-------|
| **Pool Name** | `github-pool` |
| **Provider Name** | `github-provider` |
| **Service Account** | `github-actions@samaanai-prod-1009-124126.iam.gserviceaccount.com` |
| **Workload Identity Provider** | `projects/172298808029/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

### Service Account Roles
- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/secretmanager.secretAccessor`
- `roles/cloudsql.client`
- `roles/iam.serviceAccountUser`
- `roles/storage.admin`

---

## Cloud Run Services

| Service | Purpose |
|---------|---------|
| `samaanai-finance-backend` | Django backend API |
| `samaanai-finance-frontend` | React frontend |

---

## GitHub Actions

The deployment workflow is at `.github/workflows/deploy.yml`.

**Triggers:**
- Push to `main` branch → Deploys to production
- Manual trigger via GitHub Actions UI

**No GitHub Secrets Required!** - Uses Workload Identity Federation for authentication.

---

## Post-Deployment Tasks

1. **Run migrations** (first deployment only):
   ```bash
   gcloud run jobs execute --region=us-central1 \
     --image=us-central1-docker.pkg.dev/samaanai-prod-1009-124126/samaanai/backend:latest \
     --set-cloudsql-instances=samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres \
     --set-secrets="DATABASE_URL=FINANCE_DATABASE_URL:latest" \
     --command="python,manage.py,migrate"
   ```

2. **Create superuser**:
   ```bash
   gcloud run services exec samaanai-finance-backend --region=us-central1 \
     -- python manage.py createsuperuser
   ```

3. **Update Plaid webhook URL** in Plaid Dashboard to:
   ```
   https://samaanai-finance-backend-XXXXX-uc.a.run.app/api/finance/plaid/webhook/
   ```

---

## Useful Commands

```bash
# View backend logs
gcloud run services logs read samaanai-finance-backend --region=us-central1 --limit=100

# View frontend logs  
gcloud run services logs read samaanai-finance-frontend --region=us-central1 --limit=100

# Get service URLs
gcloud run services describe samaanai-finance-backend --region=us-central1 --format='value(status.url)'
gcloud run services describe samaanai-finance-frontend --region=us-central1 --format='value(status.url)'

# Update a secret
echo -n "new-value" | gcloud secrets versions add FINANCE_SECRET_KEY --data-file=-

# Connect to Cloud SQL locally
gcloud sql connect samaanai-prod-postgres --user=finance_user --database=samaanai_finance
```
