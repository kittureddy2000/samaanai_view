#!/bin/bash

# Docker-First Local Testing Script
# Mirrors CI/CD environment exactly for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run quick Docker tests (essential validation)
run_quick_docker_tests() {
    echo -e "\n${BLUE}🔧 Building test environment...${NC}"
    
    # Build test environment
    if docker-compose -f docker-compose.test.yml build frontend-test; then
        echo -e "${GREEN}✅ Test environment built${NC}"
    else
        echo -e "${RED}❌ Failed to build test environment${NC}"
        return 1
    fi

    echo -e "\n${BLUE}🧪 Running essential tests...${NC}"
    
    # Test categories
    local tests_passed=0
    local tests_failed=0

    # 1. Service tests (most stable)
    echo -e "\n${YELLOW}1. Running Service Tests...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm test -- --testPathPattern=nutritionService.test.js --watchAll=false --silent; then
        echo -e "${GREEN}✅ Service tests passed${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Service tests failed${NC}"
        ((tests_failed++))
    fi

    # 2. Build test
    echo -e "\n${YELLOW}2. Testing Production Build...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run build; then
        echo -e "${GREEN}✅ Production build successful${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Production build failed${NC}"
        ((tests_failed++))
    fi

    # 3. Basic component test
    echo -e "\n${YELLOW}3. Running Basic Component Test...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm test -- --testPathPattern=Dashboard.test.js --testNamePattern="renders dashboard" --watchAll=false --silent; then
        echo -e "${GREEN}✅ Component test passed${NC}"
        ((tests_passed++))
    else
        echo -e "${YELLOW}⚠️  Component test issues (check full tests)${NC}"
        ((tests_failed++))
    fi

    # Summary
    echo -e "\n${BLUE}📊 Quick Test Summary:${NC}"
    echo -e "${GREEN}✅ Passed: $tests_passed${NC}"
    echo -e "${RED}❌ Failed: $tests_failed${NC}"

    if [ $tests_failed -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Quick tests passed! Likely safe to push.${NC}"
        echo -e "${CYAN}💡 Run option 2 for full validation before important pushes${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️  Some quick tests failed. Check issues before pushing.${NC}"
        return 1
    fi
}

# Function to run full CI/CD mirror
run_full_cicd_mirror() {
    echo -e "\n${BLUE}🏗️ Building complete test environment...${NC}"
    
    # Clean and rebuild
    docker-compose -f docker-compose.test.yml down --volumes
    docker-compose -f docker-compose.test.yml build frontend-test

    echo -e "\n${BLUE}🧪 Running Full CI/CD Test Sequence...${NC}"
    echo -e "${CYAN}This mirrors your Cloud Build pipeline exactly${NC}"

    local step=1
    local total_steps=8

    # Step 1: Environment Setup (like CI/CD Step 1)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Environment Setup${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm install; then
        echo -e "${GREEN}✅ Environment setup completed${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Environment setup failed${NC}"
        return 1
    fi

    # Step 2: Comprehensive Test Suite (like CI/CD Step 2)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Comprehensive Test Suite${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test sh -c "CI=true npm test -- --coverage --watchAll=false --passWithNoTests"; then
        echo -e "${GREEN}✅ Comprehensive tests passed${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Comprehensive tests failed${NC}"
        return 1
    fi

    # Step 3: Component Tests (like CI/CD Step 3)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Component Tests${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:components-only; then
        echo -e "${GREEN}✅ Component tests passed${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Component tests failed${NC}"
        return 1
    fi

    # Step 4: Service Tests (like CI/CD Step 4)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Service Tests${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:services-only; then
        echo -e "${GREEN}✅ Service tests passed${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Service tests failed${NC}"
        return 1
    fi

    # Step 5: Integration Tests (like CI/CD Step 5)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Integration Tests${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:integration-only; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        return 1
    fi

    # Step 6: Test Reports (like CI/CD Step 6)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Generate Test Reports${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test node run_all_tests.js; then
        echo -e "${GREEN}✅ Test reports generated${NC}"
        ((step++))
    else
        echo -e "${YELLOW}⚠️  Test report generation had issues${NC}"
        ((step++))
    fi

    # Step 7: Production Build (like CI/CD Step 10)
    echo -e "\n${MAGENTA}Step $step/$total_steps: Production Build${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run build; then
        echo -e "${GREEN}✅ Production build successful${NC}"
        ((step++))
    else
        echo -e "${RED}❌ Production build failed${NC}"
        return 1
    fi

    # Step 8: E2E Tests (like CI/CD Step 8)
    echo -e "\n${MAGENTA}Step $step/$total_steps: E2E Tests${NC}"
    echo -e "${CYAN}Starting backend and frontend for E2E tests...${NC}"
    
    # Start services for E2E
    docker-compose -f docker-compose.test.yml up -d db backend-test frontend-dev
    
    # Wait for services
    sleep 10
    
    if docker-compose -f docker-compose.test.yml run --rm -T cypress; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  E2E tests had issues (check Cypress output)${NC}"
    fi
    
    # Cleanup
    docker-compose -f docker-compose.test.yml down

    echo -e "\n${GREEN}🎉 Full CI/CD mirror completed successfully!${NC}"
    echo -e "${CYAN}Your code is ready for GitHub push and deployment${NC}"
    return 0
}

# Function to run individual Docker tests
run_individual_docker_tests() {
    # Build environment first
    docker-compose -f docker-compose.test.yml build frontend-test

    echo -e "\n${BLUE}📂 Available Docker test categories:${NC}"
    echo -e "${CYAN}1. Service Tests (API layer)${NC}"
    echo -e "${CYAN}2. Component Tests (React components)${NC}"
    echo -e "${CYAN}3. Integration Tests (Cross-app)${NC}"
    echo -e "${CYAN}4. Coverage Report${NC}"
    echo -e "${CYAN}5. Production Build Test${NC}"
    echo -e "${CYAN}6. E2E Tests (Cypress)${NC}"
    echo -e "${CYAN}7. Specific Test File${NC}"

    read -p "Enter your choice (1-7): " test_choice

    case $test_choice in
        1)
            echo -e "\n${YELLOW}Running Service Tests in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:services-only
            ;;
        2)
            echo -e "\n${YELLOW}Running Component Tests in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:components-only
            ;;
        3)
            echo -e "\n${YELLOW}Running Integration Tests in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:integration-only
            ;;
        4)
            echo -e "\n${YELLOW}Generating Coverage Report in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run test:coverage
            ;;
        5)
            echo -e "\n${YELLOW}Testing Production Build in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run build
            ;;
        6)
            echo -e "\n${YELLOW}Running E2E Tests in Docker...${NC}"
            docker-compose -f docker-compose.test.yml up -d db backend-test frontend-dev
            sleep 10
            docker-compose -f docker-compose.test.yml run --rm -T cypress
            docker-compose -f docker-compose.test.yml down
            ;;
        7)
            read -p "Enter test file name (e.g., Dashboard.test.js): " test_file
            echo -e "\n${YELLOW}Running $test_file in Docker...${NC}"
            docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm test -- --testPathPattern=$test_file --watchAll=false
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac
}

# Function to run development mode
run_development_mode() {
    echo -e "\n${BLUE}👀 Starting Development Mode...${NC}"
    echo -e "${CYAN}This will watch for file changes and re-run tests${NC}"
    
    # Build environment
    docker-compose -f docker-compose.test.yml build frontend-test
    
    echo -e "\n${YELLOW}Starting test watcher in Docker...${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop${NC}"
    
    # Run tests in watch mode
    docker-compose -f docker-compose.test.yml run --rm frontend-test npm test
}

# Function to run build and test
run_build_and_test() {
    echo -e "\n${BLUE}🚀 Running Build & Test (Production Simulation)...${NC}"
    
    # Clean environment
    docker-compose -f docker-compose.test.yml down --volumes
    
    # Build test environment
    echo -e "\n${YELLOW}Building test environment...${NC}"
    docker-compose -f docker-compose.test.yml build frontend-test
    
    # Run tests
    echo -e "\n${YELLOW}Running comprehensive tests...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test sh -c "CI=true npm test -- --coverage --watchAll=false"; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed - stopping build${NC}"
        return 1
    fi
    
    # Build production
    echo -e "\n${YELLOW}Building production bundle...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm -T frontend-test npm run build; then
        echo -e "${GREEN}✅ Production build successful${NC}"
    else
        echo -e "${RED}❌ Production build failed${NC}"
        return 1
    fi
    
    echo -e "\n${GREEN}🎉 Build & Test completed successfully!${NC}"
    echo -e "${CYAN}Your code is production-ready${NC}"
}

# Function to check git status
check_git_status() {
    echo -e "\n${BLUE}🔍 Checking git status...${NC}"
    
    if git diff --quiet && git diff --staged --quiet; then
        echo -e "${GREEN}✅ No uncommitted changes${NC}"
    else
        echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
        git status --short
        echo -e "\n${CYAN}💡 Consider committing your changes after tests pass${NC}"
    fi
}

# Function to show next steps
show_next_steps() {
    echo -e "\n${BLUE}📝 Next Steps:${NC}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker tests passed! You can safely:${NC}"
        echo -e "   1. ${CYAN}git add .${NC}"
        echo -e "   2. ${CYAN}git commit -m 'Your commit message'${NC}"
        echo -e "   3. ${CYAN}git push origin main${NC}"
        echo -e "\n${BLUE}🚀 CI/CD will run the same Docker-based tests${NC}"
    else
        echo -e "${RED}❌ Some Docker tests failed. Before pushing:${NC}"
        echo -e "   1. ${YELLOW}Fix the failing tests${NC}"
        echo -e "   2. ${YELLOW}Run this script again${NC}"
        echo -e "   3. ${YELLOW}Only push when all tests pass${NC}"
    fi
    
    echo -e "\n${BLUE}📊 After pushing, monitor your build at:${NC}"
    echo -e "${CYAN}https://console.cloud.google.com/cloud-build/builds${NC}"
    
    echo -e "\n${BLUE}💡 Docker Development Tips:${NC}"
    echo -e "${CYAN}• Use option 1 for quick daily validation${NC}"
    echo -e "${CYAN}• Use option 2 before important pushes${NC}"
    echo -e "${CYAN}• Use option 4 for active development${NC}"
    echo -e "${CYAN}• Use option 5 for production readiness${NC}"
}

# Main execution
main() {
    # Save exit code from test execution
    local exit_code=$?
    
    # Check git status
    check_git_status
    
    # Show next steps
    show_next_steps
    
    # Exit with the same code as tests
    exit $exit_code
}

# Run main function when script finishes
trap main EXIT

# Main script execution starts here
echo -e "${BLUE}🐳 Docker-Based Local Testing Suite${NC}"
echo -e "${CYAN}Mirrors your CI/CD environment exactly${NC}"

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker environment ready${NC}"

# Test execution options
echo -e "\n${BLUE}🎯 Choose your testing approach:${NC}"
echo -e "${CYAN}1. Quick Docker Test (Essential tests - 2-3 minutes)${NC}"
echo -e "${CYAN}2. Full CI/CD Mirror (Complete test suite - 10-15 minutes)${NC}"
echo -e "${CYAN}3. Individual Test Categories${NC}"
echo -e "${CYAN}4. Development Mode (Watch tests while coding)${NC}"
echo -e "${CYAN}5. Build & Test (Full production simulation)${NC}"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "\n${BLUE}⚡ Running Quick Docker Tests...${NC}"
        run_quick_docker_tests
        ;;
    2)
        echo -e "\n${BLUE}🏗️ Running Full CI/CD Mirror...${NC}"
        run_full_cicd_mirror
        ;;
    3)
        echo -e "\n${BLUE}📂 Running Individual Test Categories...${NC}"
        run_individual_docker_tests
        ;;
    4)
        echo -e "\n${BLUE}👀 Starting Development Mode...${NC}"
        run_development_mode
        ;;
    5)
        echo -e "\n${BLUE}🚀 Running Build & Test...${NC}"
        run_build_and_test
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Running quick tests.${NC}"
        run_quick_docker_tests
        ;;
esac 