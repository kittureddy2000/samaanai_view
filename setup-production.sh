#!/bin/bash

# =================================================================
# Samaanai Production Setup Script (Cost-Optimized)
# =================================================================
# This script sets up MINIMAL COST production environment for Samaanai
# Estimated cost: ~$7-10/month for personal projects
# Run with: ./setup-production.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (Cost-Optimized)
PROJECT_ID=${PROJECT_ID:-"using-ai-405105"}  # User's actual project
REGION=${REGION:-"us-central1"}  # Cheapest region
INSTANCE_NAME=${INSTANCE_NAME:-"samaanai-postgres"}
DB_NAME=${DB_NAME:-"samaanai_production"}
DB_USER=${DB_USER:-"samaanai_user"}
BUCKET_NAME=${BUCKET_NAME:-"${PROJECT_ID}-static-files"}

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}         Samaanai Production Setup (Cost-Optimized)${NC}"
echo -e "${BLUE}         Estimated Monthly Cost: ~$7-10/month${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Function to check if gcloud is installed and authenticated
check_gcloud() {
    echo -e "${YELLOW}Checking Google Cloud SDK...${NC}"
    
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}Error: Google Cloud SDK is not installed${NC}"
        echo "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo -e "${RED}Error: Not authenticated with Google Cloud${NC}"
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Google Cloud SDK is ready${NC}"
}

# Function to set up Google Cloud project
setup_project() {
    echo -e "${YELLOW}Setting up Google Cloud project...${NC}"
    
    # Set project
    gcloud config set project $PROJECT_ID
    
    # Enable required APIs (FREE)
    echo "Enabling required APIs..."
    gcloud services enable \
        cloudsql.googleapis.com \
        storage.googleapis.com \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        secretmanager.googleapis.com \
        artifactregistry.googleapis.com
    
    echo -e "${GREEN}✓ Project setup complete${NC}"
}

# Function to create MINIMAL COST Cloud SQL instance
setup_database() {
    echo -e "${YELLOW}Setting up MINIMAL COST Cloud SQL database...${NC}"
    
    # Check if instance exists
    if gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
        echo "Cloud SQL instance $INSTANCE_NAME already exists"
    else
        echo "Creating MINIMAL COST Cloud SQL instance (~$7/month)..."
        gcloud sql instances create $INSTANCE_NAME \
            --database-version=POSTGRES_14 \
            --tier=db-f1-micro \
            --region=$REGION \
            --storage-type=HDD \
            --storage-size=10GB \
            --no-backup \
            --maintenance-window-day=SUN \
            --maintenance-window-hour=04 \
            --project=$PROJECT_ID
    fi
    
    # Create database
    echo "Creating database..."
    gcloud sql databases create $DB_NAME \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID || echo "Database may already exist"
    
    # Create user (will prompt for password)
    echo "Creating database user..."
    echo -e "${YELLOW}Please enter a secure password for the database user:${NC}"
    gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID || echo "User may already exist"
    
    echo -e "${GREEN}✓ Database setup complete${NC}"
    echo -e "${BLUE}Connection string: /cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME${NC}"
}

# Function to create FREE TIER storage bucket
setup_storage() {
    echo -e "${YELLOW}Setting up FREE TIER Google Cloud Storage...${NC}"
    
    # Create bucket in cheapest region with standard storage
    if gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
        echo "Storage bucket $BUCKET_NAME already exists"
    else
        echo "Creating FREE TIER storage bucket..."
        gsutil mb -c STANDARD -l $REGION gs://$BUCKET_NAME
    fi
    
    # Set bucket permissions
    echo "Setting bucket permissions..."
    gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
    
    # Enable CORS
    echo "Configuring CORS..."
    cat > /tmp/cors.json << EOF
[
    {
        "origin": ["*"],
        "method": ["GET"],
        "maxAgeSeconds": 3600
    }
]
EOF
    gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
    
    # Set up lifecycle policy for cost optimization
    echo "Setting up lifecycle policy for cost optimization..."
    cat > /tmp/lifecycle.json << EOF
{
    "lifecycle": {
        "rule": [
            {
                "action": {"type": "Delete"},
                "condition": {"age": 365}
            }
        ]
    }
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
    
    # Cleanup temp files
    rm /tmp/cors.json /tmp/lifecycle.json
    
    echo -e "${GREEN}✓ Storage setup complete (FREE TIER)${NC}"
    echo -e "${BLUE}Bucket: gs://$BUCKET_NAME${NC}"
}

# Function to create service account with MINIMAL permissions
setup_service_account() {
    echo -e "${YELLOW}Setting up service account with minimal permissions...${NC}"
    
    SA_NAME="samaanai-app"
    SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
    
    # Create service account
    if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &> /dev/null; then
        echo "Service account $SA_EMAIL already exists"
    else
        echo "Creating service account..."
        gcloud iam service-accounts create $SA_NAME \
            --display-name="Samaanai Application Service Account" \
            --project=$PROJECT_ID
    fi
    
    # Grant MINIMAL required permissions
    echo "Granting minimal required permissions..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/cloudsql.client"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/storage.objectAdmin"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/secretmanager.secretAccessor"
    
    # Create key
    echo "Creating service account key..."
    gcloud iam service-accounts keys create samaanai-key.json \
        --iam-account=$SA_EMAIL \
        --project=$PROJECT_ID
    
    echo -e "${GREEN}✓ Service account setup complete${NC}"
    echo -e "${BLUE}Key saved as: samaanai-key.json${NC}"
}

# Function to create secrets (FREE TIER) - Updated to handle existing secrets
setup_secrets() {
    echo -e "${YELLOW}Setting up secrets in Secret Manager (FREE TIER)...${NC}"
    
    # Check and create SECRET_KEY if it doesn't exist
    if gcloud secrets describe SECRET_KEY --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ SECRET_KEY already exists - keeping existing value${NC}"
    else
        echo "Creating SECRET_KEY secret..."
        SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
        echo "$SECRET_KEY" | gcloud secrets create SECRET_KEY --data-file=- --project=$PROJECT_ID
    fi
    
    # Check and create DB_PASSWORD if it doesn't exist
    if gcloud secrets describe DB_PASSWORD --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ DB_PASSWORD already exists - keeping existing value${NC}"
    else
        echo -e "${YELLOW}Please enter the database password:${NC}"
        read -s DB_PASSWORD
        echo "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=- --project=$PROJECT_ID
    fi
    
    # Check and create GCS credentials if it doesn't exist
    if gcloud secrets describe GOOGLE_APPLICATION_CREDENTIALS --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ GOOGLE_APPLICATION_CREDENTIALS already exists - keeping existing value${NC}"
    else
        echo "Creating GCS credentials secret..."
        gcloud secrets create GOOGLE_APPLICATION_CREDENTIALS --data-file=samaanai-key.json --project=$PROJECT_ID
    fi
    
    # Check for OAuth credentials
    if gcloud secrets describe GOOGLE_CLIENT_ID --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ GOOGLE_CLIENT_ID already exists - OAuth is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  GOOGLE_CLIENT_ID not found - you'll need to set this up manually${NC}"
    fi
    
    if gcloud secrets describe GOOGLE_CLIENT_SECRET --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ GOOGLE_CLIENT_SECRET already exists - OAuth is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  GOOGLE_CLIENT_SECRET not found - you'll need to set this up manually${NC}"
    fi
    
    # Check for email configuration
    if gcloud secrets describe SENDGRID_API_KEY --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✓ SENDGRID_API_KEY already exists - email is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  SENDGRID_API_KEY not found - email notifications won't work${NC}"
    fi
    
    echo -e "${GREEN}✓ Secrets setup complete (FREE TIER)${NC}"
}

# Function to create artifact registry
setup_artifact_registry() {
    echo -e "${YELLOW}Setting up Artifact Registry...${NC}"
    
    REPO_NAME="samaanai-repo"
    
    # Create repository
    if gcloud artifacts repositories describe $REPO_NAME --location=$REGION --project=$PROJECT_ID &> /dev/null; then
        echo "Artifact Registry repository $REPO_NAME already exists"
    else
        echo "Creating Artifact Registry repository..."
        gcloud artifacts repositories create $REPO_NAME \
            --repository-format=docker \
            --location=$REGION \
            --project=$PROJECT_ID
    fi
    
    echo -e "${GREEN}✓ Artifact Registry setup complete${NC}"
}

# Function to display what's automated vs manual
display_automation_info() {
    echo -e "${BLUE}==================================================================${NC}"
    echo -e "${BLUE}                  What This Script Automates${NC}"
    echo -e "${BLUE}==================================================================${NC}"
    echo -e "${GREEN}✅ FULLY AUTOMATED (No manual steps needed):${NC}"
    echo "   • Enable all required Google Cloud APIs"
    echo "   • Create minimal cost Cloud SQL instance (~$7/month)"
    echo "   • Create FREE tier storage bucket with proper permissions"
    echo "   • Create service account with minimal required permissions"
    echo "   • Generate and store secrets in Secret Manager"
    echo "   • Create Artifact Registry repository"
    echo "   • Set up CORS and lifecycle policies"
    echo ""
    echo -e "${YELLOW}⚠️  REQUIRES MANUAL SETUP (Google Console):${NC}"
    echo "   🔴 OAuth Credentials (5 min): console.cloud.google.com/apis/credentials"
    echo "   🔴 Custom Domain (10 min): console.cloud.google.com/run"
    echo "   🔴 Plaid Production Keys (5 min): dashboard.plaid.com"
    echo "   🔴 SendGrid Account (5 min): sendgrid.com"
    echo ""
}

# Function to display summary
display_summary() {
    echo -e "${BLUE}==================================================================${NC}"
    echo -e "${BLUE}                Setup Complete! (~$7-10/month)${NC}"
    echo -e "${BLUE}==================================================================${NC}"
    echo -e "${GREEN}✓ Google Cloud project configured${NC}"
    echo -e "${GREEN}✓ Cloud SQL database created (db-f1-micro, ~$7/month)${NC}"
    echo -e "${GREEN}✓ Storage bucket configured (FREE tier)${NC}"
    echo -e "${GREEN}✓ Service account created with minimal permissions${NC}"
    echo -e "${GREEN}✓ Secrets stored in Secret Manager (FREE tier)${NC}"
    echo -e "${GREEN}✓ Artifact Registry repository created${NC}"
    echo ""
    echo -e "${YELLOW}Environment Variables for your .env:${NC}"
    echo "PROJECT_ID=$PROJECT_ID"
    echo "DB_HOST=/cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME"
    echo "GS_BUCKET_NAME=$BUCKET_NAME"
    echo "ENVIRONMENT=production"
    echo "REGION=$REGION"
    echo ""
    echo -e "${YELLOW}Next Steps (Manual - 20 minutes total):${NC}"
    echo "1. 🔴 Set up OAuth credentials in Google Console (5 min)"
    echo "2. 🔴 Configure custom domain in Cloud Run (10 min)"
    echo "3. 🔴 Get Plaid production keys (5 min)"
    echo "4. 🔴 Create SendGrid account for emails (optional)"
    echo ""
    echo -e "${YELLOW}Deploy Your Application:${NC}"
    echo "gcloud builds submit --config cloudbuild-backend.yaml"
    echo "gcloud builds submit --config cloudbuild-frontend.yaml"
    echo ""
    echo -e "${BLUE}Configuration files created:${NC}"
    echo "- samaanai-key.json (service account key)"
    echo "- See PRODUCTION-ENVIRONMENT-GUIDE.md for detailed manual steps"
    echo ""
    echo -e "${GREEN}🎉 Your minimal-cost production environment is ready!${NC}"
}

# Main execution
main() {
    display_automation_info
    
    echo "Starting COST-OPTIMIZED production setup for project: $PROJECT_ID"
    echo "Region: $REGION (cheapest)"
    echo "Estimated monthly cost: ~$7-10"
    echo ""
    
    read -p "Continue with setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 1
    fi
    
    check_gcloud
    setup_project
    setup_database
    setup_storage
    setup_service_account
    setup_secrets
    setup_artifact_registry
    display_summary
}

# Run main function
main "$@" 