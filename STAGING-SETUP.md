# Staging Environment Setup Guide

This guide walks you through provisioning a dedicated staging environment on Google Cloud. It covers project creation, service enablement, Container/Image storage, Cloud Run deployment, Cloud SQL (Postgres), secrets, and CI/CD wiring.

---

## 1. Create a New GCP Project

```bash
gcloud projects create YOUR-STAGE-PROJECT-ID --name="Samaanai Staging"
gcloud config set project YOUR-STAGE-PROJECT-ID
```

Set a billing account (required before enabling services):
```bash
gcloud beta billing projects link YOUR-STAGE-PROJECT-ID \
  --billing-account=YOUR-BILLING-ACCOUNT-ID
```

## 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  logging.googleapis.com
```

## 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create samaanai-stage \
  --repository-format=docker \
  --location=us-central1 \
  --description="Stage container images"
```

## 4. Provision Cloud SQL (Postgres)

1. Create instance:
   ```bash
   gcloud sql instances create samaanai-stage-sql \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --storage-type=SSD \
     --storage-size=20 \
     --root-password=SET_A_STRONG_PASSWORD
   ```
2. Create database & service user:
   ```bash
   gcloud sql databases create samaanai_stage_db --instance=samaanai-stage-sql
   gcloud sql users create stageapp --instance=samaanai-stage-sql --password=GENERATE_PASSWORD
   ```
3. Allow Cloud Run access (uses a private connection).
   - Reserve a Serverless VPC Connector if you need private IP access: 
     ```bash
     gcloud compute networks vpc-access connectors create staging-serverless \
       --region=us-central1 --network=default --range=10.8.0.0/28
     ```
   - Alternatively, use a public Cloud SQL Auth Proxy connection and lock it down via IAM like below.

## 5. Store Secrets in Secret Manager

Create secrets for app configuration (repeat for each secret):
```bash
echo -n "actual-secret-value" | gcloud secrets create STAGE_SECRET_KEY \
  --replication-policy="automatic" --data-file=-

echo -n "postgresql://stageapp:GENERATE_PASSWORD@//cloudsql/YOUR-STAGE-PROJECT-ID:us-central1:samaanai-stage-sql/samaanai_stage_db" | \
  gcloud secrets create STAGE_DATABASE_URL --replication-policy="automatic" --data-file=-
```

Recommended secrets:
- `STAGE_SECRET_KEY`
- `STAGE_DATABASE_URL`
- `STAGE_PLAID_CLIENT_ID`, `STAGE_PLAID_SECRET`
- `STAGE_PLAID_WEBHOOK_SECRET`
- `STAGE_GOOGLE_OAUTH_CLIENT`, `STAGE_GOOGLE_OAUTH_SECRET`

## 6. Grant IAM Permissions

Allow Cloud Build to deploy and access resources:
```bash
STAGE_PROJECT=YOUR-STAGE-PROJECT-ID
CLOUDBUILD_SA="$(gcloud projects describe $STAGE_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $STAGE_PROJECT \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/run.admin"

gcloud projects add-iam-policy-binding $STAGE_PROJECT \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $STAGE_PROJECT \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $STAGE_PROJECT \
  --member="serviceAccount:${CLOUDBUILD_SA}" --role="roles/cloudsql.client"
```

If Cloud Run needs to connect to Cloud SQL, give its runtime service account `roles/cloudsql.client` as well.

## 7. Configure Cloud Build Trigger (Staging)

Use a unified `cloudbuild.yaml` that accepts substitutions. Create a trigger pointing to your staging branch (for example `stage`). Substitutions to pass:
```
_ENV=stage
_REGION=us-central1
_SERVICE_BACKEND=backend-stage
_SERVICE_FRONTEND=frontend-stage
_ARTIFACT_REPO=samaanai-stage
```

Cloud Build will run tests, build images, push to Artifact Registry, and deploy to Cloud Run using these variables.

## 8. Deploy Cloud Run Services (First-Time Bootstrap)

If the trigger hasn’t run yet, deploy once manually so services exist:
```bash
gcloud run deploy backend-stage \
  --image=us-central1-docker.pkg.dev/${STAGE_PROJECT}/samaanai-stage/backend:initial \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="SECRET_KEY=projects/$STAGE_PROJECT/secrets/STAGE_SECRET_KEY/versions/latest" \
  --set-env-vars="DATABASE_URL=projects/$STAGE_PROJECT/secrets/STAGE_DATABASE_URL/versions/latest" \
  --vpc-connector=staging-serverless

# Repeat for frontend (adjust image and env vars)
```
Use Cloud Run’s “Secrets” tab in the console to mount the Secret Manager values securely.

## 9. Connect GitHub to Staging Project

1. In the Google Cloud console, navigate to **Cloud Build → Triggers**.
2. Create a new trigger:
   - Source: GitHub repo via Cloud Build GitHub app
   - Branch: `^stage$` (or similar)
   - Build config: `cloudbuild.yaml`
   - Substitutions: as listed above
3. Create a second trigger in the production project for the `main` branch with `_ENV=prod` substitutions.

## 10. Local Workflow Recap

- `docker-compose up` for local dev using `.env`.
- Push to `stage` branch → staging Cloud Run deploy.
- Merge to `main` → production Cloud Run deploy.

## 11. Cost Tips

- Keep Cloud SQL in the smallest tier (`db-f1-micro`) for staging.
- Set Cloud Run minimum instances to 0 (only pay when requests are running).
- Use lifecycle policies on logs/artifacts.

---

With this setup you have a clean separation: local Docker for development, a staging GCP project for validation, and your existing production project for live traffic. Update the README “Deployment” section to link to this guide so future you knows the exact steps.
