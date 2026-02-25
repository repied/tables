const fs = require('fs');
const path = require('path');

const inputFile = './data/dive_plans.csv';
const outputFile = './data/GF_ticks.csv';

if (!fs.existsSync(inputFile)) {
    console.error(`Input file ${inputFile} not found. Run 'npm run gendata' first.`);
    process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(',');

// Map header names to indices
const col = {};
headers.forEach((h, i) => col[h.trim()] = i);

const stopColumns = [ // we ignore 18m and deeper stops for now
    { name: '3m', depth: 3 },
    { name: '6m', depth: 6 },
    { name: '9m', depth: 9 },
    { name: '12m', depth: 12 },
    { name: '15m', depth: 15 }
];

// Data structure to store min duration for each (GFL, GFH, O2, Depth, StopDepth)
// Key: "GFL|GFH|O2|Depth|StopDepth" -> MinDuration
const minDurations = {};

// Process rows
console.log(`Processing ${lines.length - 1} rows...`);

for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < headers.length) continue;

    const gfLow = parseInt(row[col['GF low']], 10);
    const gfHigh = parseInt(row[col['GF high']], 10);
    const o2 = parseInt(row[col['O2']], 10);
    const depth = parseInt(row[col['depth']], 10);
    const duration = parseInt(row[col['duration']], 10);

    stopColumns.forEach(stop => {
        const stopTime = parseInt(row[col[stop.name]], 10);
        if (stopTime > 0) {
            const key = `${gfLow}|${gfHigh}|${o2}|${depth}|${stop.depth}`;
            if (!(key in minDurations) || duration < minDurations[key]) {
                minDurations[key] = duration;
            }
        }
    });
}

// Convert to output rows
const result = [];
for (const key in minDurations) {
    const [gfLow, gfHigh, o2, depth, stopDepth] = key.split('|').map(Number);
    result.push({ gfLow, gfHigh, o2, depth, stopDepth, minDuration: minDurations[key] });
}

// Sort the result for deterministic output
result.sort((a, b) => {
    if (a.gfLow !== b.gfLow) return a.gfLow - b.gfLow;
    if (a.gfHigh !== b.gfHigh) return a.gfHigh - b.gfHigh;
    if (a.o2 !== b.o2) return a.o2 - b.o2;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.stopDepth - b.stopDepth;
});

// Write to CSV
const outputRows = ['GF low,GF high,O2,depth,stop_depth,min_duration'];
result.forEach(r => outputRows.push(`${r.gfLow},${r.gfHigh},${r.o2},${r.depth},${r.stopDepth},${r.minDuration}`));

fs.writeFileSync(outputFile, outputRows.join('\n'));
console.log(`Generated ${outputRows.length - 1} ticks in ${outputFile}`);
