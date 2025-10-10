#!/usr/bin/env node

/**
 * Deployment Test Script for Astro-Vysio
 * Tests the live Vercel deployment
 */

const https = require('https');
const { URL } = require('url');

const DEPLOYMENT_URL = 'https://astro-vysio.vercel.app';
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Astro-Vysio-Test/1.0'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// Test function
async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await testFn();
    if (result) {
      console.log(`${COLORS.green}✓${COLORS.reset}`);
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    } else {
      console.log(`${COLORS.red}✗${COLORS.reset}`);
      results.failed++;
      results.tests.push({ name, status: 'failed', error: 'Test returned false' });
    }
  } catch (error) {
    console.log(`${COLORS.red}✗${COLORS.reset} (${error.message})`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Main test suite
async function runTests() {
  console.log(`\n${COLORS.blue}🧪 Testing Astro-Vysio Deployment${COLORS.reset}`);
  console.log(`URL: ${DEPLOYMENT_URL}\n`);

  // Test 1: Main page loads
  await runTest('Main page accessibility', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.statusCode === 200;
  });

  // Test 2: HTML content validation
  await runTest('HTML content validation', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.body.includes('<title>Astro-Vysio</title>') &&
           response.body.includes('<!DOCTYPE html>');
  });

  // Test 3: JavaScript bundle loads
  await runTest('JavaScript bundle accessibility', async () => {
    const mainResponse = await httpRequest(DEPLOYMENT_URL);
    const jsMatch = mainResponse.body.match(/src="(\/assets\/[^"]+\.js)"/);
    if (!jsMatch) return false;

    const jsUrl = `${DEPLOYMENT_URL}${jsMatch[1]}`;
    const jsResponse = await httpRequest(jsUrl);
    return jsResponse.statusCode === 200 &&
           jsResponse.headers['content-type'].includes('javascript');
  });

  // Test 4: CSS loads correctly
  await runTest('CSS accessibility', async () => {
    const mainResponse = await httpRequest(DEPLOYMENT_URL);
    const cssMatch = mainResponse.body.match(/href="(\/assets\/[^"]+\.css)"/);
    if (cssMatch) {
      const cssUrl = `${DEPLOYMENT_URL}${cssMatch[1]}`;
      const cssResponse = await httpRequest(cssUrl);
      return cssResponse.statusCode === 200;
    }
    // CSS might be inlined or loaded via JS
    return mainResponse.body.includes('style') || mainResponse.body.includes('tailwind');
  });

  // Test 5: Favicon loads
  await runTest('Favicon accessibility', async () => {
    const response = await httpRequest(`${DEPLOYMENT_URL}/vite.svg`);
    return response.statusCode === 200;
  });

  // Test 6: HTTPS and security headers
  await runTest('HTTPS and security headers', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.headers['strict-transport-security'] !== undefined;
  });

  // Test 7: Caching headers
  await runTest('Caching configuration', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.headers['cache-control'] !== undefined &&
           response.headers['etag'] !== undefined;
  });

  // Test 8: Vercel deployment headers
  await runTest('Vercel deployment verification', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.headers['server'] === 'Vercel' &&
           response.headers['x-vercel-id'] !== undefined;
  });

  // Test 9: Content type validation
  await runTest('Content-Type headers', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.headers['content-type'] === 'text/html; charset=utf-8';
  });

  // Test 10: React app mounting
  await runTest('React app structure', async () => {
    const response = await httpRequest(DEPLOYMENT_URL);
    return response.body.includes('<div id="root"></div>') &&
           response.body.includes('react');
  });

  // Print results
  console.log(`\n${COLORS.blue}📊 Test Results${COLORS.reset}`);
  console.log('─'.repeat(40));
  console.log(`${COLORS.green}Passed: ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}Failed: ${results.failed}${COLORS.reset}`);
  console.log(`Total:  ${results.passed + results.failed}`);

  // Success rate
  const successRate = (results.passed / (results.passed + results.failed) * 100).toFixed(1);
  const rateColor = successRate >= 80 ? COLORS.green : successRate >= 50 ? COLORS.yellow : COLORS.red;
  console.log(`\nSuccess Rate: ${rateColor}${successRate}%${COLORS.reset}`);

  // Overall status
  console.log('\n' + '═'.repeat(40));
  if (results.failed === 0) {
    console.log(`${COLORS.green}✅ All tests passed! Deployment is healthy.${COLORS.reset}`);
  } else if (results.failed <= 2) {
    console.log(`${COLORS.yellow}⚠️  Minor issues detected. Deployment is mostly functional.${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}❌ Multiple issues detected. Review deployment.${COLORS.reset}`);
  }

  // Failed tests details
  if (results.failed > 0) {
    console.log(`\n${COLORS.red}Failed Tests:${COLORS.reset}`);
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  console.log('\n🔗 Deployment URL: ' + COLORS.blue + DEPLOYMENT_URL + COLORS.reset);
  console.log('📝 Full deployment details: vercel inspect\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error(`\n${COLORS.red}Test suite failed: ${error.message}${COLORS.reset}`);
  process.exit(1);
});