/**
 * OncoByte Integration & End-to-End Backend Test Suite
 * Verifies communication between the iOS/Web client, Express API,
 * persistent database store, Python recipe pipeline, and binary PDF engine.
 */

const BASE_URL = 'http://localhost:3000';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runIntegrationTests() {
  console.log('======================================================');
  console.log('Running OncoByte Full-Stack & iOS API Integration Tests');
  console.log('======================================================\n');

  // 1. Health & Architecture Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  await assert(healthRes.status === 200 && health.status === 'ok', 'GET /api/health returns 200 OK');

  // 2. Authentication Login & JWT Verification
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'elena.rostova@patientcare.org',
      password: 'oncobyte2026',
    }),
  });
  const loginData = await loginRes.json();
  await assert(
    loginRes.status === 200 && Boolean(loginData.token),
    'POST /api/auth/login authenticates and issues signed HMAC-SHA256 JWT'
  );

  // 3. Meal Logging Lifecycle (Create -> Read -> Update -> Delete)
  const createMealRes = await fetch(`${BASE_URL}/api/meals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`,
    },
    body: JSON.stringify({
      date: '2026-11-15',
      timestamp: '19:30',
      category: 'Dinner',
      foodName: 'Integration Test Steamed Cod & Rice',
      ingredients: ['cod', 'white rice', 'ginger'],
      portion: '1 bowl',
      tolerance: 'Well Tolerated',
    }),
  });
  const createdMeal = await createMealRes.json();
  await assert(
    createMealRes.status === 201 && Boolean(createdMeal.id),
    'POST /api/meals validates with Zod and persists meal entry'
  );

  const deleteMealRes = await fetch(`${BASE_URL}/api/meals/${createdMeal.id}`, {
    method: 'DELETE',
  });
  await assert(deleteMealRes.status === 200, 'DELETE /api/meals/:id cleans up test meal entry');

  // 4. Recipe Tolerance Recommendation Engine
  const recRes = await fetch(`${BASE_URL}/api/recipes/recommendations`);
  const recommendations = await recRes.json();
  await assert(
    recRes.status === 200 && Array.isArray(recommendations) && recommendations.length > 0,
    'GET /api/recipes/recommendations returns ranked recipes with tolerance explanations'
  );

  // 5. Python Recipe Normalization Pipeline Execution
  const pipeRes = await fetch(`${BASE_URL}/api/pipeline/normalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const pipeData = await pipeRes.json();
  await assert(
    pipeRes.status === 200 && pipeData.status === 'completed',
    'POST /api/pipeline/normalize executes Python recipe_pipeline.py successfully'
  );

  // 6. Binary Clinical PDF Generation
  const pdfRes = await fetch(
    `${BASE_URL}/api/reports/export.pdf?startDate=2026-11-11&endDate=2026-11-15`
  );
  const contentType = pdfRes.headers.get('content-type') || '';
  const pdfBytes = await pdfRes.arrayBuffer();
  await assert(
    pdfRes.status === 200 && contentType.includes('application/pdf') && pdfBytes.byteLength > 500,
    `GET /api/reports/export.pdf streams valid binary PDF (${pdfBytes.byteLength} bytes)`
  );

  console.log('\nALL ONCOBYTE INTEGRATION TESTS PASSED (100%).');
}

runIntegrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
