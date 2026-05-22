import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up to 10 users
    { duration: '1m', target: 10 },  // Sustained load of 10 users
    { duration: '20s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],   // Less than 5% failure rate
    http_req_duration: ['p(95)<5000'], // 95% of requests complete within 5s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: AUTH_TOKEN environment variable is missing!');
    return;
  }

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  const sampleText = 'Artificial Intelligence is revolutionizing multiple industries, including healthcare, finance, and education. Deep learning models like convolutional neural networks (CNNs) have dramatically improved computer vision tasks, while transformers have redefined natural language processing (NLP). However, researchers still face challenges regarding model interpretability and the massive computational costs required for training large foundation models.';

  // Determine randomly which feature this VU will test on this iteration
  const diceRoll = Math.random();

  if (diceRoll < 0.33) {
    // 1. GENERATE TAGS (33% chance)
    const payload = JSON.stringify({ text: sampleText });
    const res = http.post(`${BASE_URL}/api/generate-tags`, payload, params);
    
    const is200 = check(res, {
      'tags is 200': (r) => r.status === 200,
      'has tags': (r) => r.status === 200 && r.json().tags !== undefined,
    });
    
    if (!is200) console.error(`[Tags] Status: ${res.status}, Body: ${res.body}`);
    
  } else if (diceRoll < 0.66) {
    // 2. INSIGHTS (33% chance)
    const payload = JSON.stringify({ text: sampleText });
    const res = http.post(`${BASE_URL}/api/insights`, payload, params);
    
    const is200 = check(res, {
      'insights is 200': (r) => r.status === 200,
      'has insights': (r) => r.status === 200 && r.json().insights !== undefined,
    });

    if (!is200) console.error(`[Insights] Status: ${res.status}, Body: ${res.body}`);

  } else {
    // 3. CITATION (33% chance)
    // Testing external fallback APIs (OpenLibrary / CrossRef) instead of Gemini
    const payload = JSON.stringify({ isbn: '9780140449136' }); 
    const res = http.post(`${BASE_URL}/api/cite`, payload, params);
    
    const is200 = check(res, {
      'cite is 200': (r) => r.status === 200,
      'has citation data': (r) => r.status === 200 && r.json().success === true,
    });

    if (!is200) console.error(`[Cite] Status: ${res.status}, Body: ${res.body}`);
  }

  // Sleep 1-3 seconds to simulate user reading the result before clicking again
  sleep(Math.random() * 2 + 1);
}
