// test-budget.js - Verifies budget calculations and logic
const assert = require('assert');

// Simulate calculation logic
function calculateBudgetStatus(usedMinutes, maxMinutes) {
  const safeMax = Math.max(1, maxMinutes);
  const ratio = usedMinutes / safeMax;
  const percentage = Math.min(100, Math.round(ratio * 100));
  const remaining = Math.max(0, safeMax - usedMinutes);
  const overtime = Math.max(0, usedMinutes - safeMax);

  let state = 'safe';
  if (ratio >= 1) {
    state = 'exceeded';
  } else if (ratio >= 0.8) {
    state = 'warning';
  }

  return {
    usedMinutes,
    maxMinutes: safeMax,
    percentage,
    remaining,
    overtime,
    isExceeded: ratio >= 1,
    isWarning: ratio >= 0.8 && ratio < 1,
    state
  };
}

function formatMinutesHuman(totalMinutes) {
  const m = Math.floor(Math.max(0, totalMinutes));
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  if (hrs > 0) {
    return `${hrs}h ${rem.toString().padStart(2, '0')}m`;
  }
  return `${rem}m`;
}

console.log('--- Testing calculateBudgetStatus ---');

// Test 1: Under limit (e.g. 90m out of 180m = 3 hrs)
const t1 = calculateBudgetStatus(90, 180);
assert.strictEqual(t1.percentage, 50);
assert.strictEqual(t1.remaining, 90);
assert.strictEqual(t1.overtime, 0);
assert.strictEqual(t1.isExceeded, false);
assert.strictEqual(t1.isWarning, false);
assert.strictEqual(t1.state, 'safe');
console.log('✓ Test 1 Passed: 90/180 min (50%) is safe');

// Test 2: Warning threshold (150m out of 180m = 83%)
const t2 = calculateBudgetStatus(150, 180);
assert.strictEqual(t2.isWarning, true);
assert.strictEqual(t2.isExceeded, false);
assert.strictEqual(t2.state, 'warning');
assert.strictEqual(t2.remaining, 30);
console.log('✓ Test 2 Passed: 150/180 min (83%) is warning');

// Test 3: Exceeded limit (200m out of 180m = 3 hrs + 20m)
const t3 = calculateBudgetStatus(200, 180);
assert.strictEqual(t3.isExceeded, true);
assert.strictEqual(t3.overtime, 20);
assert.strictEqual(t3.remaining, 0);
assert.strictEqual(t3.state, 'exceeded');
console.log('✓ Test 3 Passed: 200/180 min is exceeded by 20m');

// Test 4: Formatting
assert.strictEqual(formatMinutesHuman(180), '3h 00m');
assert.strictEqual(formatMinutesHuman(90), '1h 30m');
assert.strictEqual(formatMinutesHuman(45), '45m');
assert.strictEqual(formatMinutesHuman(0), '0m');
console.log('✓ Test 4 Passed: formatMinutesHuman displays clean strings');

console.log('\nAll Time Budget tests passed with 100% precision!');
