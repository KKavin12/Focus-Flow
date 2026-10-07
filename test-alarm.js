// test-alarm.js - Verifies alarm parsing, next-alarm diff, and scheduling logic
const assert = require('assert');

function calculateNextAlarm(alarms, currentHours, currentMins) {
  const enabledAlarms = alarms.filter(a => a.enabled);
  if (enabledAlarms.length === 0) return null;

  const curMinutes = currentHours * 60 + currentMins;

  let closest = null;
  let minDiff = Infinity;

  enabledAlarms.forEach(a => {
    const [h, m] = a.time.split(':').map(Number);
    const aMinutes = h * 60 + m;
    let diff = aMinutes - curMinutes;
    if (diff <= 0) diff += 24 * 60; // next day
    if (diff < minDiff) {
      minDiff = diff;
      closest = { ...a, diffMinutes: diff };
    }
  });

  return closest;
}

function format12Hour(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

console.log('--- Testing Alarm Clock System ---');

const sampleAlarms = [
  { id: '1', time: '08:00', label: 'Morning Kickoff', enabled: true },
  { id: '2', time: '14:30', label: 'Afternoon Sprint', enabled: true },
  { id: '3', time: '22:00', label: 'Screen Curfew', enabled: false }
];

// Test 1: Next alarm at 10:00 AM should be 14:30 (4h 30m = 270 mins)
const next1 = calculateNextAlarm(sampleAlarms, 10, 0);
assert.strictEqual(next1.id, '2');
assert.strictEqual(next1.diffMinutes, 270);
console.log('✓ Test 1 Passed: Next alarm at 10:00 AM correctly identified as 14:30 (in 4h 30m)');

// Test 2: Next alarm at 15:00 PM should wrap to tomorrow 08:00 AM (17h = 1020 mins)
const next2 = calculateNextAlarm(sampleAlarms, 15, 0);
assert.strictEqual(next2.id, '1');
assert.strictEqual(next2.diffMinutes, 17 * 60);
console.log('✓ Test 2 Passed: Next alarm wraps to tomorrow 08:00 AM');

// Test 3: 12-hour formatting
assert.strictEqual(format12Hour('08:00'), '8:00 AM');
assert.strictEqual(format12Hour('14:30'), '2:30 PM');
assert.strictEqual(format12Hour('00:15'), '12:15 AM');
assert.strictEqual(format12Hour('12:00'), '12:00 PM');
console.log('✓ Test 3 Passed: 12-hour AM/PM formatting is accurate');

console.log('\nAll Alarm Clock tests passed with 100% precision!');
