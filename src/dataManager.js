
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
            fetch('./data/mn90_stops.csv'),
            fetch('./data/mn90-n2.csv'),
            fetch('./data/mn90-majoration.csv')
        ]);

        if (!stopsRes.ok || !n2Res.ok || !majRes.ok) {
            throw new Error("Failed to fetch one or more data files");
        }

        const stopsText = await stopsRes.text();
        const n2Text = await n2Res.text();
        const majText = await majRes.text();

        MN90_Tables = parseStopsTable(stopsText);
        Table2_N2 = parseN2Table(n2Text);
        Table3_Maj = parseMajorationTable(majText);

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


// Expose to window
window.dataManager = {
    loadAllData,
    getMN90: () => MN90_Tables,
};
