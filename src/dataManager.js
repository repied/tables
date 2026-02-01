
// Global Data Stores
let MN90_Tables = {};
let Table2_N2 = null; // Structure: { intervals: [min], data: { 'A': [coeffs], ... } }
let Table3_Maj = null; // Structure: { depths: [m], data: [ { n2: val, majorations: [min] } ] }

// Helper: Parse time string "1h15" or "15" to minutes
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

// Fetch and Parse all data
async function loadAllData() {
    try {
        const [stopsRes, n2Res, majRes] = await Promise.all([
            fetch('../data/mn90_stops.csv'),
            fetch('../data/mn90-n2.csv'),
            fetch('../data/mn90-majoration.csv')
        ]);

        const stopsText = await stopsRes.text();
        const n2Text = await n2Res.text();
        const majText = await majRes.text();

        MN90_Tables = parseStopsTable(stopsText);
        Table2_N2 = parseN2Table(n2Text);
        Table3_Maj = parseMajorationTable(majText);

        console.log("All tables loaded successfully");
        return true;
    } catch (e) {
        console.error("Failed to load data", e);
        return false;
    }
}

function parseStopsTable(csv) {
    const lines = csv.split('\n');
    const data = {};

    // Header: D,T,15m,12m,9m,6m,3m,DTR,GPS
    // Skip row 0
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

        // Note: DTR (col 7) is in CSV, but we calculate it dynamically in script.js usually.
        // But the CSV has official DTR. We can store it if needed, or stick to calculation.
        // GPS is col 8
        const group = cols[8] ? cols[8].trim() : null;

        if (!data[depth]) data[depth] = [];

        data[depth].push({
            time: time,
            stops: stops,
            group: group
        });
    }
    return data;
}

function parseN2Table(csv) {
    const lines = csv.split('\n');
    // Header: GPS,0h15,0h30...
    const header = lines[0].trim().split(',');
    const intervals = header.slice(1).map(parseDuration);

    const data = {};
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const group = cols[0].trim();
        const coeffs = cols.slice(1).map(v => parseFloat(v)); // Can be NaN if empty
        data[group] = coeffs;
    }

    return { intervals, data };
}

function parseMajorationTable(csv) {
    const lines = csv.split('\n');
    // Header: N2,12,15...
    const header = lines[0].trim().split(',');
    const depths = header.slice(1).map(d => parseInt(d));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const n2 = parseFloat(cols[0]);
        const majorations = cols.slice(1).map(v => parseInt(v)); // Can be NaN
        data.push({ n2, majorations });
    }
    // Sort by N2 just in case
    data.sort((a, b) => a.n2 - b.n2);

    return { depths, data };
}

// Logic for Successive Dive
function calculateSuccessive(prevGroup, interval, depth) {
    if (!prevGroup || !interval || !depth) return { error: "Missing parameters" };
    if (!Table2_N2 || !Table3_Maj) return { error: "Data not loaded" };

    // 1. Get Residual Nitrogen (Coeff)
    // Find Interval Column: Largest interval in table <= actual interval
    // Standard MN90: If interval > max table interval (12h), N2 is 0.8 (or reset).
    // Actually, usually >12h means new dive (no residual).

    if (interval > 720) { // > 12h
        return { majoration: 0, n2: 0 };
    }

    const row = Table2_N2.data[prevGroup];
    if (!row) return { error: "Invalid Group" };

    // Find index
    // Table intervals are e.g. 15, 30, 45.
    // Logic: If I wait 20 min, I use 15 min column.
    // If I wait 10 min, it's < 15. Consecutive logic applies (not handled here).
    // We assume input > 15 min.

    let intervalIndex = -1;
    for (let i = Table2_N2.intervals.length - 1; i >= 0; i--) {
        if (interval >= Table2_N2.intervals[i]) {
            intervalIndex = i;
            break;
        }
    }

    if (intervalIndex === -1) {
        // Interval < 15 mins.
        return { error: "Interval too short (<15min)" };
    }

    const n2Coeff = row[intervalIndex];
    if (!n2Coeff || isNaN(n2Coeff)) {
        // If empty, usually means coefficient is back to baseline or specific rule.
        // In CSV provided, trails are empty?
        // CSV: "A, 0.84... 0.81,,,,,"
        // If empty, it likely means saturated/no change or fully desaturated?
        // Actually, looking at CSV, for A: after 6h00 (0.81), cells are empty.
        // This implies 0.81 persists or resets?
        // MN90: After 12h, desaturation complete.
        // If empty, and > last value, assume desaturation continues or stays at min?
        // Let's assume if we are off the chart to the right, N2 is minimal (or 0.8/0.79 i.e. pure air).
        // Let's return 0 majoration.
        return { majoration: 0, n2: "min" };
    }

    // 2. Get Majoration
    // Find N2 Row: Smallest N2 in table >= actual N2
    const majTable = Table3_Maj.data;
    const targetN2Row = majTable.find(r => r.n2 >= n2Coeff);

    if (!targetN2Row) {
        // N2 too high? Should not happen if tables align.
        return { error: "N2 out of range" };
    }

    // Find Depth Column: Smallest depth in table >= actual depth
    // Depths: 12, 15...
    const majDepths = Table3_Maj.depths;
    const depthIndex = majDepths.findIndex(d => d >= depth);

    if (depthIndex === -1) {
        // Too deep (beyond 60m?)
        return { error: "Too deep for table" };
    }

    const majoration = targetN2Row.majorations[depthIndex];

    return {
        majoration: majoration || 0,
        n2: n2Coeff
    };
}

// Expose to window
window.dataManager = {
    loadAllData,
    getMN90: () => MN90_Tables,
    calculateSuccessive
};
