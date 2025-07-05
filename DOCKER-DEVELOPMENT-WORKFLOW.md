# 🐳 Docker-First Development Workflow

## Overview

This guide outlines the Docker-based development workflow that **exactly mirrors** your Google Cloud Run CI/CD environment. By developing and testing locally with Docker, you ensure 100% consistency between local development and production deployment.

## 🚀 Quick Start

### Daily Development Workflow

```bash
# 1. Quick validation (2-3 minutes)
./docker-test.sh
# Choose option 1: Quick Docker Test

# 2. Make your changes

# 3. Test again before committing
./docker-test.sh
# Choose option 1 again

# 4. If tests pass, commit and push
git add .
git commit -m "Your changes"
git push origin main
```

## 🧪 Testing Options

### Option 1: Quick Docker Test ⚡ (2-3 minutes)
**Use for**: Daily development, quick validation
```bash
./docker-test.sh
# Choose: 1
```
**What it runs**:
- Service tests (API layer validation)
- Production build test
- Basic component test
- Essential functionality check

### Option 2: Full CI/CD Mirror 🏗️ (10-15 minutes)
**Use for**: Before important pushes, release preparation
```bash
./docker-test.sh
# Choose: 2
```
**What it runs**:
- Complete 8-step CI/CD pipeline simulation
- All test categories (component, service, integration)
- E2E tests with Cypress
- Production build validation
- **Exactly mirrors your Cloud Build pipeline**

### Option 3: Individual Test Categories 📂
**Use for**: Debugging specific issues
```bash
./docker-test.sh
# Choose: 3
```
**Available categories**:
- Service Tests (API layer)
- Component Tests (React components)
- Integration Tests (Cross-app)
- Coverage Report
- Production Build Test
- E2E Tests (Cypress)
- Specific Test File

### Option 4: Development Mode 👀
**Use for**: Active development with live feedback
```bash
./docker-test.sh
# Choose: 4
```
**What it does**:
- Watches for file changes
- Re-runs tests automatically
- Provides instant feedback while coding

### Option 5: Build & Test 🚀
**Use for**: Production readiness validation
```bash
./docker-test.sh
# Choose: 5
```
**What it runs**:
- Full test suite
- Production build
- Complete validation pipeline

## 🔄 Development Cycle

### 1. Start Development Session
```bash
# Option A: Quick check before starting
./docker-test.sh  # Choose option 1

# Option B: Development mode for live feedback
./docker-test.sh  # Choose option 4
```

### 2. During Development
```bash
# Make changes to your code

# Quick validation (run frequently)
./docker-test.sh  # Choose option 1

# For specific issues
./docker-test.sh  # Choose option 3
```

### 3. Before Committing
```bash
# Full validation (important changes)
./docker-test.sh  # Choose option 2

# OR quick validation (minor changes)
./docker-test.sh  # Choose option 1
```

### 4. Ready to Push
```bash
# If all tests pass:
git add .
git commit -m "Descriptive commit message"
git push origin main

# Monitor CI/CD at:
# https://console.cloud.google.com/cloud-build/builds
```

## 🎯 When to Use Each Option

| Scenario | Recommended Option | Duration | Purpose |
|----------|-------------------|----------|---------|
| Daily coding | Option 1 | 2-3 min | Quick validation |
| Before lunch break | Option 1 | 2-3 min | Save point check |
| Before important push | Option 2 | 10-15 min | Full validation |
| Debugging tests | Option 3 | Variable | Targeted testing |
| Active development | Option 4 | Continuous | Live feedback |
| Release preparation | Option 5 | 8-12 min | Production ready |

## 🐳 Docker Environment Benefits

### 1. **Exact CI/CD Mirroring**
- Same Node.js version
- Same package versions
- Same environment variables
- Same build process

### 2. **Consistent Results**
- No "works on my machine" issues
- Identical to production environment
- Reproducible test results

### 3. **Isolated Testing**
- Clean environment every run
- No local dependency conflicts
- Fresh state for each test

### 4. **Full Stack Testing**
- Database integration
- Backend API testing
- Frontend E2E testing
- Complete application validation

## 🛠️ Docker Commands Reference

### Direct Docker Commands
```bash
# Build test environment
docker-compose -f docker-compose.test.yml build frontend-test

# Run specific tests
docker-compose -f docker-compose.test.yml run --rm frontend-test npm test -- --testPathPattern=Dashboard.test.js

# Run with coverage
docker-compose -f docker-compose.test.yml run --rm frontend-test npm run test:coverage

# Production build
docker-compose -f docker-compose.test.yml run --rm frontend-test npm run build

# Start full environment
docker-compose -f docker-compose.test.yml up -d

# Clean up
docker-compose -f docker-compose.test.yml down --volumes
```

### Environment Variables
```bash
# CI mode (no watch, exit after tests)
CI=true

# Generate source maps
GENERATE_SOURCEMAP=false

# Test environment
NODE_ENV=test
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Docker Build Failures
```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker-compose -f docker-compose.test.yml build --no-cache frontend-test
```

#### 2. Test Failures
```bash
# Run specific failing test
./docker-test.sh  # Choose option 3, then option 7
# Enter: FailingTest.test.js

# Check test output in detail
docker-compose -f docker-compose.test.yml run --rm frontend-test npm test -- --testPathPattern=FailingTest.test.js --verbose
```

#### 3. Port Conflicts
```bash
# Stop all containers
docker-compose -f docker-compose.test.yml down

# Check for running containers
docker ps

# Kill specific containers if needed
docker kill $(docker ps -q)
```

### Performance Tips

#### 1. **Use .dockerignore**
```bash
# Ensure .dockerignore excludes:
node_modules
coverage
build
.git
```

#### 2. **Layer Caching**
```bash
# Dependencies change less frequently
# Copy package.json first, then source code
```

#### 3. **Parallel Testing**
```bash
# Use multi-core testing
docker-compose -f docker-compose.test.yml run --rm frontend-test npm test -- --maxWorkers=4
```

## 📊 Test Results & Reports

### Coverage Reports
- Location: `frontend/coverage/lcov-report/index.html`
- Generated by: Option 2, Option 4, or Option 5
- View in browser after tests complete

### Test Artifacts
- Screenshots: Available in Docker volumes
- Cypress videos: Generated during E2E tests
- Jest reports: Console output and files

### CI/CD Comparison
- Local Docker results should **exactly match** Cloud Build results
- Same test files, same environment, same outcomes
- Use Option 2 to validate before pushing

## 🎉 Success Criteria

### ✅ Ready to Push When:
1. **Option 1** passes (quick validation)
2. **Option 2** passes (full validation for important changes)
3. All tests show green ✅
4. Production build succeeds
5. No Docker environment errors

### ⚠️ Fix Before Pushing When:
1. Any test shows red ❌
2. Production build fails
3. Docker environment issues
4. Coverage drops significantly

## 💡 Pro Tips

1. **Use Option 1 frequently** - it's fast and catches most issues
2. **Use Option 4 during active development** - live feedback saves time
3. **Always use Option 2 before important releases**
4. **Keep Docker images updated** - rebuild weekly
5. **Monitor CI/CD builds** - ensure local and remote results match

---

## 🚀 Next Steps

1. **Run your first test**: `./docker-test.sh` and choose Option 1
2. **Set up your development routine** using the cycle above
3. **Customize** the script for your specific needs
4. **Integrate** with your Git workflow

Your Docker-based development environment is now ready! 🎉 