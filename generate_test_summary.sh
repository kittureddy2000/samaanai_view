#!/bin/bash
# Script to generate a consolidated test summary from all test logs

# Get the most recent log files
BACKEND_LOG=$(ls -t logs/backend_tests_*.log 2>/dev/null | head -1)
FRONTEND_LOG=$(ls -t logs/frontend_component_tests_*.log 2>/dev/null | head -1)
E2E_LOG=$(ls -t logs/cypress_tests_*.log 2>/dev/null | head -1)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create a summary file
SUMMARY_FILE="logs/test_summary_${TIMESTAMP}.txt"

echo "# Calorie Tracker Test Summary" > $SUMMARY_FILE
echo "Generated: $(date)" >> $SUMMARY_FILE
echo "" >> $SUMMARY_FILE

# Extract and add backend test results
echo "## Backend Tests" >> $SUMMARY_FILE
if [ -f "$BACKEND_LOG" ]; then
    echo "Source: $BACKEND_LOG" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract summary line - typically contains "X passed, Y failed in Z seconds"
    SUMMARY=$(grep -A 5 "= FAILURES =" $BACKEND_LOG 2>/dev/null || grep -A 5 "= .* passed in .* sec" $BACKEND_LOG 2>/dev/null)
    if [ ! -z "$SUMMARY" ]; then
        echo "```" >> $SUMMARY_FILE
        echo "$SUMMARY" >> $SUMMARY_FILE
        echo "```" >> $SUMMARY_FILE
    fi
    
    # Extract test names and status
    echo "" >> $SUMMARY_FILE
    echo "### Individual Test Results" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract test results
    TEST_RESULTS=$(grep "PASSED\|FAILED\|ERROR\|SKIPPED" $BACKEND_LOG | grep -v "FAILURES" | grep -v "collected")
    if [ ! -z "$TEST_RESULTS" ]; then
        echo "$TEST_RESULTS" >> $SUMMARY_FILE
    else
        echo "No detailed test results found in log." >> $SUMMARY_FILE
    fi
    echo "" >> $SUMMARY_FILE
else
    echo "No backend test logs found." >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
fi

# Extract and add frontend component test results
echo "## Frontend Component Tests" >> $SUMMARY_FILE
if [ -f "$FRONTEND_LOG" ]; then
    echo "Source: $FRONTEND_LOG" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract summary line (Test Suites and Tests lines from Jest output)
    SUITE_SUMMARY=$(grep "Test Suites:" $FRONTEND_LOG 2>/dev/null)
    TESTS_SUMMARY=$(grep "Tests:" $FRONTEND_LOG 2>/dev/null)
    
    if [ ! -z "$SUITE_SUMMARY" ] || [ ! -z "$TESTS_SUMMARY" ]; then
        echo "```" >> $SUMMARY_FILE
        [ ! -z "$SUITE_SUMMARY" ] && echo "$SUITE_SUMMARY" >> $SUMMARY_FILE
        [ ! -z "$TESTS_SUMMARY" ] && echo "$TESTS_SUMMARY" >> $SUMMARY_FILE
        echo "```" >> $SUMMARY_FILE
    fi
    
    # Extract individual test results
    echo "" >> $SUMMARY_FILE
    echo "### Test Suites" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Find PASS/FAIL lines for test files
    TEST_FILES=$(grep "^PASS\|^FAIL" $FRONTEND_LOG 2>/dev/null)
    if [ ! -z "$TEST_FILES" ]; then
        echo "$TEST_FILES" >> $SUMMARY_FILE
    else
        echo "No test suite results found in log." >> $SUMMARY_FILE
    fi
    
    # Extract test names from the Jest output
    echo "" >> $SUMMARY_FILE
    echo "### Individual Test Cases" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract indented test descriptions that start with a checkmark
    TEST_CASES=$(grep -E "^ {2}✓" $FRONTEND_LOG 2>/dev/null)
    if [ ! -z "$TEST_CASES" ]; then
        echo "$TEST_CASES" >> $SUMMARY_FILE
    else
        echo "No individual test cases found in log." >> $SUMMARY_FILE
    fi
    echo "" >> $SUMMARY_FILE
else
    echo "No frontend component test logs found." >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
fi

# Extract and add E2E test results
echo "## E2E Tests" >> $SUMMARY_FILE
if [ -f "$E2E_LOG" ]; then
    echo "Source: $E2E_LOG" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract the final results table - this is at the end of the log after "Run Finished"
    RESULTS_TABLE=$(grep -A 20 "Run Finished" $E2E_LOG 2>/dev/null | grep -A 20 "Spec")
    
    if [ ! -z "$RESULTS_TABLE" ]; then
        echo "### Test Summary" >> $SUMMARY_FILE
        echo "```" >> $SUMMARY_FILE
        echo "$RESULTS_TABLE" >> $SUMMARY_FILE
        echo "```" >> $SUMMARY_FILE
    fi
    
    # Extract individual test results
    echo "" >> $SUMMARY_FILE
    echo "### Test Files" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Extract the lines showing which spec files were run (from the beginning of the output)
    SPEC_FILES=$(grep -A 4 "Spec" $E2E_LOG | grep -E "^  │ ✔" 2>/dev/null)
    if [ ! -z "$SPEC_FILES" ]; then
        echo "$SPEC_FILES" >> $SUMMARY_FILE
    else
        echo "No test file results found in log." >> $SUMMARY_FILE
    fi
    
    # Extract individual test cases that passed/failed
    echo "" >> $SUMMARY_FILE
    echo "### Individual Test Cases" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    
    # Look for test descriptions in the Cypress output (lines after test suite names)
    TEST_CASES=$(grep -A 2 -B 0 "passing" $E2E_LOG | grep -E "^ {4}✓" 2>/dev/null)
    if [ ! -z "$TEST_CASES" ]; then
        echo "$TEST_CASES" >> $SUMMARY_FILE
    else
        echo "No individual test cases found in log." >> $SUMMARY_FILE
    fi
    echo "" >> $SUMMARY_FILE
else
    echo "No E2E test logs found." >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
fi

# Add overall status summary at the top
echo -e "\n# Overall Test Status\n" >> $SUMMARY_FILE.tmp

BACKEND_STATUS="⚠️ Unknown"
FRONTEND_STATUS="⚠️ Unknown"
E2E_STATUS="⚠️ Unknown"

# Check backend status
if [ -f "$BACKEND_LOG" ]; then
    if grep -q "failed" $BACKEND_LOG; then
        BACKEND_STATUS="❌ Failed"
    elif grep -q "passed" $BACKEND_LOG; then
        BACKEND_STATUS="✅ Passed"
    fi
else
    BACKEND_STATUS="⚠️ Not Run"
fi

# Check frontend status
if [ -f "$FRONTEND_LOG" ]; then
    if grep -q "failing" $FRONTEND_LOG; then
        FRONTEND_STATUS="❌ Failed"
    elif grep -q "All tests passed" $FRONTEND_LOG || grep -q "Tests:.*0 failed" $FRONTEND_LOG; then
        FRONTEND_STATUS="✅ Passed"
    fi
else
    FRONTEND_STATUS="⚠️ Not Run"
fi

# Check E2E status
if [ -f "$E2E_LOG" ]; then
    if grep -q "All specs passed" $E2E_LOG; then
        E2E_STATUS="✅ Passed"
    elif grep -q "failing" $E2E_LOG; then
        E2E_STATUS="❌ Failed"
    fi
else
    E2E_STATUS="⚠️ Not Run"
fi

echo "| Test Type | Status |" >> $SUMMARY_FILE.tmp
echo "|-----------|--------|" >> $SUMMARY_FILE.tmp
echo "| Backend Tests | $BACKEND_STATUS |" >> $SUMMARY_FILE.tmp
echo "| Frontend Component Tests | $FRONTEND_STATUS |" >> $SUMMARY_FILE.tmp
echo "| E2E Tests | $E2E_STATUS |" >> $SUMMARY_FILE.tmp
echo "" >> $SUMMARY_FILE.tmp

cat $SUMMARY_FILE >> $SUMMARY_FILE.tmp
mv $SUMMARY_FILE.tmp $SUMMARY_FILE

echo "Test summary generated at: $SUMMARY_FILE"
echo ""
echo "Summary:"
echo "---------"
echo "Backend Tests: $BACKEND_STATUS"
echo "Frontend Component Tests: $FRONTEND_STATUS"
echo "E2E Tests: $E2E_STATUS"
echo ""
echo "See $SUMMARY_FILE for details" 