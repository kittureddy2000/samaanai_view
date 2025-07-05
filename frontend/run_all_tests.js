#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const testSuites = [
  {
    name: 'Nutrition Dashboard Tests',
    command: 'npm',
    args: ['test', '--', 'Dashboard.test.js', '--watchAll=false', '--verbose'],
    category: 'component'
  },
  {
    name: 'Nutrition Daily Entry Tests',
    command: 'npm',
    args: ['test', '--', 'DailyEntry.test.js', '--watchAll=false', '--verbose'],
    category: 'component'
  },
  {
    name: 'Nutrition Weekly Report Tests',
    command: 'npm',
    args: ['test', '--', 'WeeklyReport.test.js', '--watchAll=false', '--verbose'],
    category: 'component'
  },
  {
    name: 'Finance Dashboard Tests',
    command: 'npm',
    args: ['test', '--', 'FinanceDashboard.test.js', '--watchAll=false', '--verbose'],
    category: 'component'
  },
  {
    name: 'Finance Account Settings Tests',
    command: 'npm',
    args: ['test', '--', 'AccountSettings.test.js', '--watchAll=false', '--verbose'],
    category: 'component'
  },
  {
    name: 'Nutrition Service Tests',
    command: 'npm',
    args: ['test', '--', 'nutritionService.test.js', '--watchAll=false', '--verbose'],
    category: 'service'
  },
  {
    name: 'API Service Tests',
    command: 'npm',
    args: ['test', '--', 'api.test.js', '--watchAll=false', '--verbose'],
    category: 'service'
  },
  {
    name: 'Finance API Tests',
    command: 'npm',
    args: ['test', '--', 'financeApi.test.js', '--watchAll=false', '--verbose'],
    category: 'service'
  },
  {
    name: 'Integration Tests',
    command: 'npm',
    args: ['test', '--', 'app.integration.test.js', '--watchAll=false', '--verbose'],
    category: 'integration'
  },
  {
    name: 'Auth Context Tests',
    command: 'npm',
    args: ['test', '--', 'AuthContext.test.js', '--watchAll=false', '--verbose'],
    category: 'context'
  },
  {
    name: 'All Tests with Coverage',
    command: 'npm',
    args: ['run', 'test:coverage', '--', '--watchAll=false'],
    category: 'coverage'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Test runner
class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.reportDir = path.join(__dirname, 'test-reports');
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runTest(testSuite) {
    colorLog(`\n🏃 Running: ${testSuite.name}`, 'cyan');
    colorLog(`Command: ${testSuite.command} ${testSuite.args.join(' ')}`, 'blue');
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const child = spawn(testSuite.command, testSuite.args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        const result = {
          name: testSuite.name,
          category: testSuite.category,
          success,
          duration,
          code,
          stdout,
          stderr,
          timestamp: new Date().toISOString()
        };

        this.results.push(result);

        if (success) {
          colorLog(`✅ ${testSuite.name} passed in ${formatDuration(duration)}`, 'green');
        } else {
          colorLog(`❌ ${testSuite.name} failed in ${formatDuration(duration)} (exit code: ${code})`, 'red');
        }

        resolve(result);
      });

      child.on('error', (error) => {
        colorLog(`💥 Error running ${testSuite.name}: ${error.message}`, 'red');
        const result = {
          name: testSuite.name,
          category: testSuite.category,
          success: false,
          duration: Date.now() - startTime,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        this.results.push(result);
        resolve(result);
      });
    });
  }

  async runAllTests() {
    colorLog('\n🚀 Starting comprehensive test suite execution...', 'bright');
    colorLog(`Total test suites: ${testSuites.length}`, 'yellow');

    for (const testSuite of testSuites) {
      await this.runTest(testSuite);
    }

    this.generateReport();
  }

  async runTestsByCategory(category) {
    const filteredTests = testSuites.filter(test => test.category === category);
    
    if (filteredTests.length === 0) {
      colorLog(`\n❌ No tests found for category: ${category}`, 'red');
      return;
    }

    colorLog(`\n🎯 Running ${category} tests...`, 'bright');
    colorLog(`Found ${filteredTests.length} test suite(s)`, 'yellow');

    for (const testSuite of filteredTests) {
      await this.runTest(testSuite);
    }

    this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    colorLog('\n📊 Test Execution Summary', 'bright');
    colorLog('='.repeat(50), 'blue');
    colorLog(`Total Tests: ${this.results.length}`, 'blue');
    colorLog(`✅ Passed: ${passed}`, 'green');
    colorLog(`❌ Failed: ${failed}`, 'red');
    colorLog(`⏱️  Total Duration: ${formatDuration(totalDuration)}`, 'blue');
    colorLog('='.repeat(50), 'blue');

    if (failed > 0) {
      colorLog('\n💥 Failed Tests:', 'red');
      this.results.filter(r => !r.success).forEach(result => {
        colorLog(`  • ${result.name}`, 'red');
      });
    }

    // Generate detailed reports
    this.generateJSONReport();
    this.generateHTMLReport();

    colorLog(`\n📄 Reports generated in: ${this.reportDir}`, 'blue');
  }

  generateJSONReport() {
    const report = {
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        duration: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      testCategories: {
        component: this.results.filter(r => r.category === 'component').length,
        service: this.results.filter(r => r.category === 'service').length,
        integration: this.results.filter(r => r.category === 'integration').length,
        context: this.results.filter(r => r.category === 'context').length,
        coverage: this.results.filter(r => r.category === 'coverage').length
      }
    };

    const reportPath = path.join(this.reportDir, `test-report-${createTimestamp()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    colorLog(`JSON report: ${reportPath}`, 'blue');
  }

  generateHTMLReport() {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = Date.now() - this.startTime;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Samaanai Test Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .stat-card.passed { border-left-color: #28a745; }
        .stat-card.failed { border-left-color: #dc3545; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #6c757d; font-size: 0.9em; }
        .results { padding: 0 30px 30px; }
        .test-item { display: flex; align-items: center; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: #f8f9fa; }
        .test-item.passed { border-left: 4px solid #28a745; }
        .test-item.failed { border-left: 4px solid #dc3545; }
        .test-status { width: 20px; height: 20px; border-radius: 50%; margin-right: 15px; }
        .test-status.passed { background: #28a745; }
        .test-status.failed { background: #dc3545; }
        .test-name { flex: 1; font-weight: 500; }
        .test-duration { color: #6c757d; font-size: 0.9em; }
        .test-category { background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; }
        .category-filter { padding: 20px 30px; border-bottom: 1px solid #dee2e6; }
        .filter-btn { background: #e9ecef; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 20px; cursor: pointer; }
        .filter-btn.active { background: #007bff; color: white; }
        .timestamp { text-align: center; padding: 20px; color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Samaanai Test Report</h1>
            <p>Comprehensive test suite results - Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${this.results.length}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatDuration(totalDuration)}</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>

        <div class="category-filter">
            <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
            <button class="filter-btn" onclick="filterTests('component')">Components</button>
            <button class="filter-btn" onclick="filterTests('service')">Services</button>
            <button class="filter-btn" onclick="filterTests('integration')">Integration</button>
            <button class="filter-btn" onclick="filterTests('context')">Context</button>
            <button class="filter-btn" onclick="filterTests('coverage')">Coverage</button>
        </div>
        
        <div class="results">
            ${this.results.map(result => `
                <div class="test-item ${result.success ? 'passed' : 'failed'}" data-category="${result.category}">
                    <div class="test-status ${result.success ? 'passed' : 'failed'}"></div>
                    <div class="test-name">${result.name}</div>
                    <div class="test-category">${result.category}</div>
                    <div class="test-duration">${formatDuration(result.duration)}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Report generated on ${new Date().toISOString()}
        </div>
    </div>

    <script>
        function filterTests(category) {
            const items = document.querySelectorAll('.test-item');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            items.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;

    const reportPath = path.join(this.reportDir, `test-report-${createTimestamp()}.html`);
    fs.writeFileSync(reportPath, html);
    colorLog(`HTML report: ${reportPath}`, 'blue');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const categoryArg = args.find(arg => arg.startsWith('--category='));
  const category = categoryArg ? categoryArg.split('=')[1] : null;

  const runner = new TestRunner();

  if (category) {
    await runner.runTestsByCategory(category);
  } else {
    await runner.runAllTests();
  }

  const failed = runner.results.filter(r => !r.success).length;
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    colorLog(`💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
} 