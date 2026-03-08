
global.window = {};
require('../src/planning.js');
const Planning = global.window.Planning;

// Mock environment for testing src/planning.js which usually runs in browser
global.Float64Array = Float64Array;

console.log("--- Testing Issue 79: GF Penalty Logic ---");

const initialTensions = new Float64Array(16).fill(0.79 * (1.01325 - 0.0627));
// Simulate a dive ending with high nitrogen in fast compartments
for (let i = 0; i < 8; i++) {
    initialTensions[i] = 1.5; // Fast compartments
}
for (let i = 8; i < 16; i++) {
    initialTensions[i] = 0.8; // Slow compartments
}

const interval = 60; // 60 minutes surface interval

console.log("Testing None penalty:");
const tensionsNone = Planning.calculatePenalizedTensions(initialTensions, interval, 'None');
console.log("Comp 0 tension (5min HL):", tensionsNone[0].toFixed(4));
// Expected: fast desaturation. 5min HL -> 12 HLs in 60min. Tension should be very close to surface.

console.log("Testing C60 penalty:");
const tensionsC60 = Planning.calculatePenalizedTensions(initialTensions, interval, 'C60');
console.log("Comp 0 tension (capped at 60min HL):", tensionsC60[0].toFixed(4));
// Expected: slower desaturation. 60min HL -> 1 HL in 60min. Tension should be much higher than 'None'.

if (tensionsC60[0] > tensionsNone[0]) {
    console.log("✅ SUCCESS: C60 penalty correctly results in higher residual nitrogen for fast compartments.");
} else {
    console.log("❌ FAILURE: C60 penalty did not increase residual nitrogen.");
}

console.log("Testing C120 penalty:");
const tensionsC120 = Planning.calculatePenalizedTensions(initialTensions, interval, 'C120');
console.log("Comp 0 tension (capped at 120min HL):", tensionsC120[0].toFixed(4));

if (tensionsC120[0] > tensionsC60[0]) {
    console.log("✅ SUCCESS: C120 penalty is more conservative than C60.");
} else {
    console.log("❌ FAILURE: C120 penalty should be more conservative than C60.");
}

// Ensure slow compartments are NOT affected
console.log("Checking slow compartments (HL > 120):");
const slowIdx = 15; // 635 min HL
console.log("Slow comp tension (None):", tensionsNone[slowIdx].toFixed(4));
console.log("Slow comp tension (C120):", tensionsC120[slowIdx].toFixed(4));

if (Math.abs(tensionsNone[slowIdx] - tensionsC120[slowIdx]) < 1e-10) {
    console.log("✅ SUCCESS: Slow compartments are unaffected by penalty.");
} else {
    console.log("❌ FAILURE: Penalty affected slow compartments.");
}
