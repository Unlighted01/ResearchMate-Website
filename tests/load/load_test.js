import http from 'k6/http';
import { check, sleep } from 'k6';

// =============================================================================
// LOAD TEST CONFIGURATION
// =============================================================================
// This simulates a "Ramp-up" scenario:
// 1. Starts with 0 users, goes to 20 users over 30 seconds.
// 2. Stays at 20 users for 1 minute (the "Stress" period).
// 3. Ramps down to 0 users over 20 seconds.
// =============================================================================
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '20s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // Error rate must be less than 1%
    http_req_duration: ['p(95)<2000'], // 95% of requests must be under 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: AUTH_TOKEN environment variable is missing!');
    console.log('Run with: $env:AUTH_TOKEN="your_jwt"; k6 run load_test.js');
    return;
  }

  // 1. Check Health (Lightweight)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Perform a "Summarize" (Heavyweight - hits Gemini & DB)
  const payload = JSON.stringify({
    text: 'Artificial Intelligence is transforming the world. It is used in medicine, finance, and transportation. Researchers are developing new algorithms every day to make it more efficient.',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  const summarizeRes = http.post(`${BASE_URL}/api/summarize`, payload, params);
  
  check(summarizeRes, {
    'summarize is 200': (r) => r.status === 200,
    'has summary text': (r) => r.json().summary !== undefined,
  });

  // Wait between 1-3 seconds to simulate "thinking" time
  sleep(Math.random() * 2 + 1);
}
