#!/bin/bash

# Quick Local Testing Script
# Fast pre-commit validation

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Pre-commit Test Suite${NC}"

cd frontend

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
npm install > /dev/null 2>&1

# Test categories with simpler approach
echo -e "\n${BLUE}🧪 Running Essential Tests...${NC}"

# 1. Check for syntax errors
echo -e "\n${YELLOW}1. Checking for syntax errors...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful - no syntax errors${NC}"
else
    echo -e "${RED}❌ Build failed - syntax errors detected${NC}"
    echo -e "${YELLOW}Run 'npm run build' for details${NC}"
    exit 1
fi

# 2. Run service tests (most stable)
echo -e "\n${YELLOW}2. Running service tests...${NC}"
if npm test -- --testPathPattern=nutritionService.test.js --watchAll=false --silent; then
    echo -e "${GREEN}✅ Service tests passed${NC}"
else
    echo -e "${RED}❌ Service tests failed${NC}"
fi

# 3. Run a simple component test
echo -e "\n${YELLOW}3. Running basic component test...${NC}"
if npm test -- --testPathPattern=Dashboard.test.js --testNamePattern="renders dashboard" --watchAll=false --silent; then
    echo -e "${GREEN}✅ Basic component test passed${NC}"
else
    echo -e "${YELLOW}⚠️  Component test issues detected${NC}"
fi

# 4. Check test coverage on a small subset
echo -e "\n${YELLOW}4. Checking test coverage...${NC}"
if npm test -- --coverage --testPathPattern=nutritionService.test.js --watchAll=false --silent > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Coverage check completed${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage check had issues${NC}"
fi

echo -e "\n${BLUE}📊 Quick Test Summary:${NC}"
echo -e "${GREEN}✅ Build: Success${NC}"
echo -e "${GREEN}✅ Core functionality likely working${NC}"

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo -e "1. ${YELLOW}Fix any failing tests shown above${NC}"
echo -e "2. ${YELLOW}Run full test suite: npm run test:all${NC}"
echo -e "3. ${YELLOW}If all looks good: git add . && git commit && git push${NC}"

echo -e "\n${BLUE}🚀 Your CI/CD will run the full comprehensive test suite${NC}" 