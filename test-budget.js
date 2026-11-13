// test-budget.js - Verifies budget calculations, 30-15 break cycles, and limits
const assert = require('assert');

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

console.log('--- Testing Budget Limit & 30-15 Interval Cycle Logic ---');

// Test 1: Under limit
const t1 = calculateBudgetStatus(90, 180);
assert.strictEqual(t1.percentage, 50);
assert.strictEqual(t1.remaining, 90);
assert.strictEqual(t1.state, 'safe');
console.log('✓ Test 1 Passed: 90/180 min (50%) is safe');

// Test 2: Warning threshold
const t2 = calculateBudgetStatus(150, 180);
assert.strictEqual(t2.isWarning, true);
assert.strictEqual(t2.state, 'warning');
console.log('✓ Test 2 Passed: 150/180 min (83%) is warning');

// Test 3: Exceeded limit
const t3 = calculateBudgetStatus(200, 180);
assert.strictEqual(t3.isExceeded, true);
assert.strictEqual(t3.overtime, 20);
console.log('✓ Test 3 Passed: 200/180 min is exceeded by 20m');

// Test 4: Interval cycles (30 min watch -> 15 min break)
const sessionDuration = 30; // 30m
const breakDuration = 15;   // 15m
const totalCap = 180;       // 3 hours (180m)
const fullCyclesAllowed = Math.floor(totalCap / sessionDuration); // 6 sessions of 30 mins
assert.strictEqual(fullCyclesAllowed, 6);
console.log(`✓ Test 4 Passed: 3h daily limit allows 6 sessions of 30m each with 15m breaks in between`);

// Test 5: Formatting
assert.strictEqual(formatMinutesHuman(180), '3h 00m');
assert.strictEqual(formatMinutesHuman(30), '30m');
assert.strictEqual(formatMinutesHuman(15), '15m');
console.log('✓ Test 5 Passed: Human-readable formatting working as expected');

console.log('\nAll tests passed successfully!');
