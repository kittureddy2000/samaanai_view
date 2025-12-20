#!/bin/bash

# Setup script for comprehensive test suite CI/CD integration
# Run this script to configure your Google Cloud Build environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Update these values
PROJECT_ID="${PROJECT_ID:-your-project-id}"
REPO_OWNER="${REPO_OWNER:-your-github-username}"
REPO_NAME="${REPO_NAME:-your-repo-name}"
REGION="${REGION:-us-west1}"
ARTIFACTS_BUCKET="samaanai-build-artifacts"

echo -e "${BLUE}🚀 Setting up comprehensive test suite CI/CD integration${NC}"
echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Repository: ${REPO_OWNER}/${REPO_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists gcloud; then
    echo -e "${RED}❌ gcloud CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command_exists gsutil; then
    echo -e "${RED}❌ gsutil not found. Please install Google Cloud SDK.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Set the project
echo -e "\n${BLUE}🔧 Configuring gcloud project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "\n${BLUE}🔌 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create artifacts bucket
echo -e "\n${BLUE}🪣 Creating artifacts bucket...${NC}"
if gsutil ls gs://$ARTIFACTS_BUCKET >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Bucket gs://$ARTIFACTS_BUCKET already exists${NC}"
else
    gsutil mb -l $REGION gs://$ARTIFACTS_BUCKET
    echo -e "${GREEN}✅ Bucket gs://$ARTIFACTS_BUCKET created${NC}"
fi

# Apply lifecycle policy
echo -e "\n${BLUE}⏰ Applying lifecycle policy to artifacts bucket...${NC}"
gsutil lifecycle set lifecycle.json gs://$ARTIFACTS_BUCKET
echo -e "${GREEN}✅ Lifecycle policy applied${NC}"

# Get Cloud Build service account
echo -e "\n${BLUE}🔐 Configuring IAM permissions...${NC}"
BUILD_SERVICE_ACCOUNT=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@cloudbuild.gserviceaccount.com

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
    --role="roles/artifactregistry.writer"

echo -e "${GREEN}✅ IAM permissions configured${NC}"

# Create Artifact Registry repository if it doesn't exist
echo -e "\n${BLUE}📦 Setting up Artifact Registry...${NC}"
if gcloud artifacts repositories describe samaanai-repo --location=$REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Repository samaanai-repo already exists${NC}"
else
    gcloud artifacts repositories create samaanai-repo \
        --repository-format=docker \
        --location=$REGION \
        --description="Samaanai application images"
    echo -e "${GREEN}✅ Artifact Registry repository created${NC}"
fi

# Create Cloud Build triggers
echo -e "\n${BLUE}⚡ Creating Cloud Build triggers...${NC}"

# Frontend trigger
echo -e "${YELLOW}Creating frontend trigger...${NC}"
gcloud builds triggers create github \
    --repo-name=$REPO_NAME \
    --repo-owner=$REPO_OWNER \
    --branch-pattern="^main$" \
    --build-config=cloudbuild-frontend.yaml \
    --name=samaanai-frontend-comprehensive-tests \
    --description="Comprehensive test suite for frontend with detailed reporting" \
    --included-files="frontend/**,docker-compose.test.yml,cloudbuild-frontend.yaml" \
    || echo -e "${YELLOW}⚠️  Frontend trigger may already exist${NC}"

# Backend trigger
echo -e "${YELLOW}Creating backend trigger...${NC}"
gcloud builds triggers create github \
    --repo-name=$REPO_NAME \
    --repo-owner=$REPO_OWNER \
    --branch-pattern="^main$" \
    --build-config=cloudbuild-backend.yaml \
    --name=samaanai-backend-tests \
    --description="Backend test suite with deployment" \
    --included-files="backend/**,docker-compose.test.yml,cloudbuild-backend.yaml" \
    || echo -e "${YELLOW}⚠️  Backend trigger may already exist${NC}"

echo -e "${GREEN}✅ Cloud Build triggers created${NC}"

# Make test runner executable
echo -e "\n${BLUE}🔧 Making test runner executable...${NC}"
chmod +x frontend/run_all_tests.js
echo -e "${GREEN}✅ Test runner is now executable${NC}"

# Create a test run to verify setup
echo -e "\n${BLUE}🧪 Running a test build to verify setup...${NC}"
echo -e "${YELLOW}This will trigger a comprehensive test run...${NC}"

read -p "Do you want to run a test build now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gcloud builds submit --config=cloudbuild-frontend.yaml .
    echo -e "${GREEN}✅ Test build completed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping test build${NC}"
fi

echo -e "\n${GREEN}🎉 CI/CD setup completed successfully!${NC}"
echo -e "\n${BLUE}📊 Your comprehensive test suite will now run:${NC}"
echo -e "  • ✅ Component tests (Dashboard, DailyEntry, FinanceDashboard)"
echo -e "  • ✅ Service tests (nutritionService)"
echo -e "  • ✅ Integration tests (cross-app functionality)"
echo -e "  • ✅ Coverage reports with detailed HTML output"
echo -e "  • ✅ Cypress E2E tests"
echo -e "  • ✅ Artifact storage with automatic lifecycle management"

echo -e "\n${BLUE}📁 Test artifacts will be stored at:${NC}"
echo -e "  gs://$ARTIFACTS_BUCKET/frontend-tests/build-<BUILD_ID>/"
echo -e "  gs://$ARTIFACTS_BUCKET/cypress/build-<BUILD_ID>/"

echo -e "\n${BLUE}🔗 Access your build results:${NC}"
echo -e "  Cloud Build Console: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo -e "  Cloud Storage: https://console.cloud.google.com/storage/browser/$ARTIFACTS_BUCKET?project=$PROJECT_ID"

echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "  1. Update cloud-build-triggers.yaml with your actual GitHub repo details"
echo -e "  2. Commit and push your changes to trigger the first build"
echo -e "  3. Monitor the build progress in Cloud Build console"
echo -e "  4. Review test reports in Cloud Storage" 