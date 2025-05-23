#!/bin/bash
# Script to run tests and generate reports

# Create logs directory if it doesn't exist
mkdir -p logs

# Set timestamp for log files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Parse command line arguments
RUN_BACKEND=true
RUN_FRONTEND_UNIT=true
RUN_FRONTEND_E2E=true

# Parse command line options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --backend-only) RUN_FRONTEND_UNIT=false; RUN_FRONTEND_E2E=false ;;
        --frontend-only) RUN_BACKEND=false ;;
        --unit-only) RUN_FRONTEND_E2E=false ;;
        --e2e-only) RUN_BACKEND=false; RUN_FRONTEND_UNIT=false ;;
        --help) echo "Usage: $0 [--backend-only] [--frontend-only] [--unit-only] [--e2e-only]"; exit 0 ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Run backend tests if enabled
if [ "$RUN_BACKEND" = true ]; then
    echo "Running backend tests..."
    echo "============================"

    # Run backend tests with HTML and coverage reports
    docker compose -f docker-compose.test.yml run --rm \
      -v $(pwd)/logs:/app/logs \
      backend-test python -m pytest -v \
      --html=/app/logs/backend_tests_${TIMESTAMP}.html \
      --self-contained-html \
      --cov=. \
      --cov-report=xml:/app/logs/coverage_${TIMESTAMP}.xml \
      --cov-report=term \
      | tee logs/backend_tests_${TIMESTAMP}.log
fi

# Run frontend unit tests if enabled
if [ "$RUN_FRONTEND_UNIT" = true ]; then
    echo ""
    echo "Running frontend unit tests..."
    echo "============================"

    # Run frontend component tests with verbose output
    docker compose -f docker-compose.test.yml run --rm \
      -v $(pwd)/logs:/app/logs \
      frontend-test npm test -- --verbose --no-watchman --testMatch="**/src/**/__tests__/**/*.js" \
      | tee logs/frontend_component_tests_${TIMESTAMP}.log
fi

# Run E2E tests if enabled
if [ "$RUN_FRONTEND_E2E" = true ]; then
    # Start services for E2E tests
    echo ""
    echo "Running E2E tests..."
    echo "============================"
    echo "Starting services for E2E tests..."
    docker compose -f docker-compose.test.yml up -d db backend-test frontend-dev

    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10

    # Run Cypress tests
    echo "Running Cypress E2E tests..."
    docker compose -f docker-compose.test.yml run --rm \
      -v $(pwd)/logs:/app/logs \
      cypress \
      | tee logs/cypress_tests_${TIMESTAMP}.log

    # Shut down all services
    echo "Shutting down services..."
    docker compose -f docker-compose.test.yml down
fi

# Print summary
echo ""
echo "Test Results:"
echo "============="
if [ "$RUN_BACKEND" = true ]; then
    echo "- Backend log: logs/backend_tests_${TIMESTAMP}.log"
    echo "- Backend HTML report: logs/backend_tests_${TIMESTAMP}.html"
    echo "- Coverage XML: logs/coverage_${TIMESTAMP}.xml"
fi
if [ "$RUN_FRONTEND_UNIT" = true ]; then
    echo "- Frontend component tests: logs/frontend_component_tests_${TIMESTAMP}.log"
fi
if [ "$RUN_FRONTEND_E2E" = true ]; then
    echo "- Cypress E2E tests: logs/cypress_tests_${TIMESTAMP}.log"
fi 