import { robustFetchUrlTool } from './route';

async function runTests() {
  // Test 1: Insufficient data triggers retry
  const params1 = {
    url: 'https://example.com/empty',
    recursionDepth: 1,
    maxPages: 2,
    userIntent: 'analyze the table',
  };
  const userMessage1 = 'Summarize the table at this URL.';
  const result1 = await robustFetchUrlTool(params1, userMessage1, 3, 6);
  console.log('Test 1 (insufficient data triggers retry):', result1.retryInfo || result1);

  // Test 2: User says "go deeper" triggers retry
  const params2 = {
    url: 'https://example.com/data',
    recursionDepth: 1,
    maxPages: 2,
    userIntent: 'analyze the table',
  };
  const userMessage2 = 'Go deeper and get more data.';
  const result2 = await robustFetchUrlTool(params2, userMessage2, 3, 6);
  console.log('Test 2 (user says go deeper):', result2.retryInfo || result2);

  // Test 3: Sufficient data, no retry
  const params3 = {
    url: 'https://example.com/full',
    recursionDepth: 1,
    maxPages: 2,
    userIntent: 'analyze the table',
  };
  const userMessage3 = 'Summarize the table at this URL.';
  const result3 = await robustFetchUrlTool(params3, userMessage3, 3, 6);
  console.log('Test 3 (sufficient data, no retry):', result3.retryInfo || result3);
}

runTests().catch(console.error);
