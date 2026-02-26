const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser environment
const sandbox = {
    console: console,
    dataManager: {
        getMN90: () => ({}),
        getTable2: () => ({}),
        getTable3: () => ({})
    }
};
sandbox.window = sandbox;

// Load planning.js
const planningPath = path.join(__dirname, 'src', 'planning.js');
const planningCode = fs.readFileSync(planningPath, 'utf8');

// Create context and run script
vm.createContext(sandbox);
vm.runInContext(planningCode, sandbox);

const Planning = sandbox.Planning;

// Test cases - using parameters that cause significant computation
// Deep dives, long durations, low GF (more stops)
const testCases = [];
const depths = [40, 60, 80, 100];
const durations = [20, 40, 60, 90];
const gfs = [[30, 70], [10, 90], [50, 80]];
const gases = [21, 32]; // O2 %

for (const depth of depths) {
    for (const duration of durations) {
        for (const [gfLow, gfHigh] of gfs) {
            for (const o2 of gases) {
                testCases.push({
                    bottomTime: duration,
                    maxDepth: depth,
                    gfLow: gfLow,
                    gfHigh: gfHigh,
                    fN2: (100 - o2) / 100
                });
            }
        }
    }
}

// Warmup
console.log("Warming up...");
for (let i = 0; i < 5; i++) {
    for (const params of testCases) {
        Planning.calculateBuhlmannPlan(params);
    }
}

console.log(`Running benchmark with ${testCases.length} test cases...`);

const start = process.hrtime();
const iterations = 20; // Run enough times to get stable measurement

for (let i = 0; i < iterations; i++) {
    for (const params of testCases) {
        Planning.calculateBuhlmannPlan(params);
    }
}

const end = process.hrtime(start);
const durationInMs = (end[0] * 1000 + end[1] / 1e6);

console.log(`Total time: ${durationInMs.toFixed(2)} ms`);
console.log(`Average time per iteration: ${(durationInMs / iterations).toFixed(2)} ms`);
console.log(`Average time per call: ${(durationInMs / (iterations * testCases.length)).toFixed(4)} ms`);
