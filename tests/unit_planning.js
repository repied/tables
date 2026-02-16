const fs = require('fs');
const path = require('path');

// 1. Setup Environment
const window = {};
global.window = window;

// 2. Load Data Helpers (Adapted from dataManager.js)
function parseDuration(str) {
    if (!str) return 0;
    str = str.toString().trim();
    if (str.includes('h')) {
        const parts = str.split('h');
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        return h * 60 + m;
    }
    return parseInt(str) || 0;
}

function parseStopsTable(csv) {
    const lines = csv.split('\n');
    const data = {};
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const depth = parseInt(cols[0]);
        const time = parseDuration(cols[1]);
        if (isNaN(depth) || isNaN(time)) continue;

        const stops = {};
        if (cols[2]) stops[15] = parseInt(cols[2]);
        if (cols[3]) stops[12] = parseInt(cols[3]);
        if (cols[4]) stops[9] = parseInt(cols[4]);
        if (cols[5]) stops[6] = parseInt(cols[5]);
        if (cols[6]) stops[3] = parseInt(cols[6]);

        const group = cols[8] ? cols[8].trim() : null;

        if (!data[depth]) data[depth] = [];
        data[depth].push({ time, stops, group });
    }
    return data;
}

function parseN2Table(csv) {
    const lines = csv.split('\n');
    const header = lines[0].trim().split(',');
    const intervals = header.slice(1).map(parseDuration);
    const data = {};
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const group = cols[0].trim();
        const coeffs = cols.slice(1).map(v => parseFloat(v));
        data[group] = coeffs;
    }
    return { intervals, data };
}

function parseMajorationTable(csv) {
    const lines = csv.split('\n');
    const header = lines[0].trim().split(',');
    const depths = header.slice(1).map(d => parseInt(d));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const n2 = parseFloat(cols[0]);
        const majorations = cols.slice(1).map(v => parseInt(v));
        data.push({ n2, majorations });
    }
    data.sort((a, b) => a.n2 - b.n2);
    return { depths, data };
}

// 3. Load Data Files
const stopsCsv = fs.readFileSync(path.join(__dirname, '../data/mn90_stops.csv'), 'utf8');
const n2Csv = fs.readFileSync(path.join(__dirname, '../data/mn90-n2.csv'), 'utf8');
const majCsv = fs.readFileSync(path.join(__dirname, '../data/mn90-majoration.csv'), 'utf8');

const mn90Data = parseStopsTable(stopsCsv);
const table2Data = parseN2Table(n2Csv);
const table3Data = parseMajorationTable(majCsv);

window.dataManager = {
    getMN90: () => mn90Data,
    getTable2: () => table2Data,
    getTable3: () => table3Data
};

// 4. Load Planning.js
const planningScript = fs.readFileSync(path.join(__dirname, '../src/planning.js'), 'utf8');
eval(planningScript);
const Planning = window.Planning;


// 5. Test Runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

console.log("--- Starting Unit Tests ---\n");

// --- Tests ---

// Test 1: MN90 Deco Dive - 20m 50min
// Expectation from table (verified in CSV): Group I, Stop 3m: 4min. DTR 6.
{
    const profile = Planning.getMN90Profile(20, 50);
    assert(profile !== null, "MN90 Profile found for 20m 50min");
    assertEqual(profile.profile.group, 'I', "Group should be I");
    assertEqual(profile.profile.stops['3'], 4, "Should have 4 min stop at 3m");

    const dtr = Planning.calculateDTR(20, profile.profile.stops);
    // Calculation (verified):
    // Ascent 20->3 = 1.133
    // Stop = 4
    // Ascent 3->0 = 0.5
    // Total = 5.633 -> ceil -> 6
    assertEqual(dtr, 6, "DTR should be 6 min");
}

// Test 2: Gas Consumption
// 20m 50min. SAC 20 L/min. Tank 15L.
// Bottom: 50 * 3 * 20 = 3000 L
// Ascent: ~164.2 L
// Total = 3165 L (approx)
{
    const profile = Planning.getMN90Profile(20, 50);
    const sac = 20;
    const gas = Planning.calculateGasConsumption(20, 50, profile.profile, sac);
    const expected = 3165;
    assert(Math.abs(gas - expected) <= 5, `Gas consumption close to ${expected} (got ${gas})`);
}

// Test 3: Successive Dive
// Dive 1: 20m 40min -> Group H
// Interval 1h00 (60 min).
// Table 2 (N2) for H, 60 min (index 3).
// Row H (verified): 1.13, 1.10, 1.08, 1.05. -> Coeff 1.05.
// Table 3 (Maj) for 1.05. Next row is 1.07.
// Depth 15m. Row 1.07, col 15m -> 44 min (verified: 57, 44...).
{
    const result = Planning.calculateSuccessive('H', 60, 15);

    assert(result.n2 !== undefined, "Successive dive returns N2");
    assert(result.majoration !== undefined, "Successive dive returns majoration");
    assertEqual(result.n2, 1.05, "N2 coeff for H, 60min should be 1.05");
    assertEqual(result.majoration, 44, "Majoration for H, 60min, 15m should be 44 min");
}

// Test 4: Nitrox EAD
// 30m, Nitrox 32.
// EAD = (30+10) * 0.68 / 0.79 - 10
// 40 * 0.68 / 0.79 = 34.43
// 34.43 - 10 = 24.43 -> 24.4m
{
    const ead = Planning.calculateEAD(30, 32);
    assert(Math.abs(ead - 24.43) < 0.1, `EAD calculation for 30m 32% (got ${ead.toFixed(2)})`);
}

// Test 5: Buehlmann Simple Plan
// 30m, 20min, GF 30/70, Air
{
    const plan = Planning.calculateBuhlmannPlan({
        bottomTime: 20,
        maxDepth: 30,
        gfLow: 30,
        gfHigh: 70,
        fN2: 0.79
    });

    assert(plan.dtr > 0, "Buehlmann plan has DTR");
    assert(plan.profile.stops, "Buehlmann plan has stops object");
    // 30m 20min on Air usually requires no Deco or very little.
    // With GF 30/70 it might trigger something small or safety stop logic isn't explicit but algo runs.
}


function check_dtr_single_dive(depth, time, expectedDTR) {
    const profile = Planning.getMN90Profile(depth, time);
    const dtr = Planning.calculateDTR(depth, profile.profile.stops);
    console.log(`DTR for ${depth}m ${time}min: ${dtr} min`);
    assertEqual(dtr, expectedDTR, `DTR should be ${expectedDTR} min`);
}
function check_stops_single_dive(depth, time, expectedStops) {
    const profile = Planning.getMN90Profile(depth, time);
    console.log(`Stops for ${depth}m ${time}min: ${JSON.stringify(profile.profile.stops)}`);
    assertEqual(profile.profile.stops, expectedStops, `Stops should be ${JSON.stringify(expectedStops)}`);
}

{
    // source https://diveapp.p6ril.fr/
    check_dtr_single_dive(20, 50, 6);
    check_dtr_single_dive(20, 75, 26);
    check_dtr_single_dive(20, 90, 36);
    check_dtr_single_dive(10, 75, 1);
    check_dtr_single_dive(10, 360, 2);
    check_dtr_single_dive(34, 20, 8);
    check_dtr_single_dive(34, 45, 51);
    check_dtr_single_dive(55, 5, 5);
    check_dtr_single_dive(55, 50, 136); // diveapp gives 134 but maybe different ascent speed
    check_stops_single_dive(55, 50, { 12: 8, 9: 19, 6: 35, 3: 69 });
    check_stops_single_dive(55, 20, { 9: 1, 6: 6, 3: 27 });
    check_stops_single_dive(5, 360, {}); // diveapp not thew same as what I have in the pdf
    check_stops_single_dive(20, 60, { 3: 13 });
    check_stops_single_dive(19, 60, { 3: 13 });
    check_stops_single_dive(20, 58, { 3: 13 });
}

console.log(`\n-- - Finished-- - `);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) process.exit(1);
