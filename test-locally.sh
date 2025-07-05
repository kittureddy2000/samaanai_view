#!/bin/bash

# Local Testing Script - Run before pushing to GitHub
# This script mimics the CI/CD environment locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Local Testing Suite - Pre-commit Validation${NC}"
echo -e "${CYAN}This script runs the same tests that will execute in CI/CD${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️  Docker not found. Skipping Docker-based tests.${NC}"
    SKIP_DOCKER=true
else
    SKIP_DOCKER=false
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Test execution options
echo -e "\n${BLUE}🎯 Choose testing approach:${NC}"
echo -e "${CYAN}1. Quick Local Tests (npm - fastest)${NC}"
echo -e "${CYAN}2. Docker Tests (mirrors CI/CD exactly)${NC}"
echo -e "${CYAN}3. Both Local and Docker Tests${NC}"
echo -e "${CYAN}4. Individual Test Categories${NC}"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "\n${BLUE}🚀 Running Quick Local Tests...${NC}"
        run_local_tests
        ;;
    2)
        if [ "$SKIP_DOCKER" = true ]; then
            echo -e "${RED}❌ Docker not available. Running local tests instead.${NC}"
            run_local_tests
        else
            echo -e "\n${BLUE}🐳 Running Docker Tests...${NC}"
            run_docker_tests
        fi
        ;;
    3)
        echo -e "\n${BLUE}🔄 Running Both Local and Docker Tests...${NC}"
        run_local_tests
        if [ "$SKIP_DOCKER" = false ]; then
            run_docker_tests
        fi
        ;;
    4)
        echo -e "\n${BLUE}📂 Running Individual Test Categories...${NC}"
        run_individual_tests
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Running default local tests.${NC}"
        run_local_tests
        ;;
esac

# Function to run local tests
run_local_tests() {
    echo -e "\n${BLUE}📁 Navigating to frontend directory...${NC}"
    cd frontend

    echo -e "\n${BLUE}📦 Installing/updating dependencies...${NC}"
    npm install

    echo -e "\n${BLUE}🧪 Running comprehensive test suite...${NC}"
    
    # Test categories
    local tests_passed=0
    local tests_failed=0

    echo -e "\n${YELLOW}1. Running Component Tests...${NC}"
    if npm run test:components-only; then
        echo -e "${GREEN}✅ Component tests passed${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Component tests failed${NC}"
        ((tests_failed++))
    fi

    echo -e "\n${YELLOW}2. Running Service Tests...${NC}"
    if npm run test:services-only; then
        echo -e "${GREEN}✅ Service tests passed${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Service tests failed${NC}"
        ((tests_failed++))
    fi

    echo -e "\n${YELLOW}3. Running Integration Tests...${NC}"
    if npm run test:integration-only; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        ((tests_failed++))
    fi

    echo -e "\n${YELLOW}4. Generating Coverage Report...${NC}"
    if npm run test:coverage; then
        echo -e "${GREEN}✅ Coverage report generated${NC}"
        echo -e "${CYAN}📊 Coverage report available at: frontend/coverage/lcov-report/index.html${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Coverage generation failed${NC}"
        ((tests_failed++))
    fi

    # Summary
    echo -e "\n${BLUE}📊 Local Test Summary:${NC}"
    echo -e "${GREEN}✅ Passed: $tests_passed${NC}"
    echo -e "${RED}❌ Failed: $tests_failed${NC}"

    if [ $tests_failed -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All local tests passed! Safe to push to GitHub.${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️  Some tests failed. Fix issues before pushing to GitHub.${NC}"
        return 1
    fi
}

# Function to run Docker tests
run_docker_tests() {
    echo -e "\n${BLUE}🐳 Building Docker test environment...${NC}"
    cd "$(dirname "$0")"  # Go to project root
    
    # Build test environment
    if docker-compose -f docker-compose.test.yml build frontend-test; then
        echo -e "${GREEN}✅ Docker test environment built${NC}"
    else
        echo -e "${RED}❌ Failed to build Docker test environment${NC}"
        return 1
    fi

    echo -e "\n${BLUE}🧪 Running tests in Docker environment...${NC}"

    # Run tests using react-scripts directly
    echo -e "\n${YELLOW}Running comprehensive test suite in Docker...${NC}"
    if docker-compose -f docker-compose.test.yml run --rm frontend-test sh -c "CI=true npm test -- --coverage --watchAll=false --passWithNoTests"; then
        echo -e "${GREEN}✅ Docker tests passed${NC}"
    else
        echo -e "${RED}❌ Docker tests failed${NC}"
        return 1
    fi

    echo -e "\n${GREEN}🎉 Docker tests completed successfully!${NC}"
    return 0
}

# Function to run individual test categories
run_individual_tests() {
    cd frontend
    npm install

    echo -e "\n${BLUE}📂 Available test categories:${NC}"
    echo -e "${CYAN}1. Dashboard Tests${NC}"
    echo -e "${CYAN}2. Daily Entry Tests${NC}"
    echo -e "${CYAN}3. Finance Dashboard Tests${NC}"
    echo -e "${CYAN}4. Service Tests${NC}"
    echo -e "${CYAN}5. Integration Tests${NC}"
    echo -e "${CYAN}6. All Component Tests${NC}"
    echo -e "${CYAN}7. Run All Tests${NC}"

    read -p "Enter your choice (1-7): " test_choice

    case $test_choice in
        1)
            echo -e "\n${YELLOW}Running Dashboard Tests...${NC}"
            npm run test:dashboard
            ;;
        2)
            echo -e "\n${YELLOW}Running Daily Entry Tests...${NC}"
            npm test -- --testPathPattern=DailyEntry.test.js --watchAll=false
            ;;
        3)
            echo -e "\n${YELLOW}Running Finance Dashboard Tests...${NC}"
            npm run test:finance
            ;;
        4)
            echo -e "\n${YELLOW}Running Service Tests...${NC}"
            npm run test:services
            ;;
        5)
            echo -e "\n${YELLOW}Running Integration Tests...${NC}"
            npm run test:integration
            ;;
        6)
            echo -e "\n${YELLOW}Running All Component Tests...${NC}"
            npm run test:components
            ;;
        7)
            echo -e "\n${YELLOW}Running All Tests...${NC}"
            node run_all_tests.js
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac
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
        echo -e "${GREEN}✅ All tests passed! You can safely:${NC}"
        echo -e "   1. ${CYAN}git add .${NC}"
        echo -e "   2. ${CYAN}git commit -m 'Your commit message'${NC}"
        echo -e "   3. ${CYAN}git push origin main${NC}"
        echo -e "\n${BLUE}🚀 Your code will trigger CI/CD pipeline with the same tests${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Before pushing:${NC}"
        echo -e "   1. ${YELLOW}Fix the failing tests${NC}"
        echo -e "   2. ${YELLOW}Run this script again${NC}"
        echo -e "   3. ${YELLOW}Only push when all tests pass${NC}"
    fi
    
    echo -e "\n${BLUE}📊 After pushing, monitor your build at:${NC}"
    echo -e "${CYAN}https://console.cloud.google.com/cloud-build/builds${NC}"
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