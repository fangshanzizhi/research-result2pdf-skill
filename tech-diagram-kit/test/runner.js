#!/usr/bin/env node
/**
 * 测试运行器
 */
const path = require('path');
const fs = require('fs');

const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });

const tests = [
  'unit/test_engine.js',
  'unit/test_python_adapter.js',
  'unit/test_domains.js',
];

console.log('========================================');
console.log('Tech Diagram Kit - Test Runner');
console.log('========================================\n');

(async () => {
  for (const test of tests) {
    const testPath = path.join(__dirname, test);
    if (fs.existsSync(testPath)) {
      console.log(`\n>>> Running ${test}\n`);
      try {
        require(testPath);
        // Note: some tests are async but fire-and-forget; we add small delay
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        console.error(`❌ ${test} failed:`, e.message);
      }
    } else {
      console.log(`⚠️  Test not found: ${testPath}`);
    }
  }
  console.log('\n========================================');
  console.log('All tests completed');
  console.log('========================================');
})();
