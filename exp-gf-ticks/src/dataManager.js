
// Global Data Stores
let MN90_Tables = {};
let Table2_N2 = null; // Structure: { intervals: [min], data: { 'A': [coeffs], ... } }
let Table3_Maj = null; // Structure: { depths: [m], data: [ { n2: val, majorations: [min] } ] }
let GF_Store = null; // { grid, lookup }

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
        const [stopsRes, n2Res, majRes, gfRes] = await Promise.all([
            fetch('./data/mn90_stops.csv'),
            fetch('./data/mn90-n2.csv'),
            fetch('./data/mn90-majoration.csv'),
            fetch('./data/GF_ticks_grid.csv').catch(() => ({ ok: false }))
        ]);

        if (!stopsRes.ok || !n2Res.ok || !majRes.ok) {
            throw new Error("Failed to fetch one or more data files");
        }

        const stopsText = await stopsRes.text();
        const n2Text = await n2Res.text();
        const majText = await majRes.text();

        if (gfRes && gfRes.ok) {
            const gfText = await gfRes.text();
            GF_Store = parseGFTicks(gfText);
        }

        MN90_Tables = parseStopsTable(stopsText);
        Table2_N2 = parseN2Table(n2Text);
        Table3_Maj = parseMajorationTable(majText);

        return true;
    } catch (e) {
        console.error(e);
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

function parseGFTicks(csv) {
    const lines = csv.split('\n');
    const lookup = {};
    const sets = { gfl: new Set(), gfh: new Set(), o2: new Set(), depth: new Set() };

    // Header: GF low,GF high,O2,depth,stop_depth,min_duration
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length < 6) continue;

        const gfl = parseInt(cols[0]);
        const gfh = parseInt(cols[1]);
        const o2 = parseInt(cols[2]);
        const depth = parseInt(cols[3]);
        const stopDepth = parseInt(cols[4]);
        const minDuration = parseInt(cols[5]);

        sets.gfl.add(gfl);
        sets.gfh.add(gfh);
        sets.o2.add(o2);
        sets.depth.add(depth);

        if (!lookup[gfl]) lookup[gfl] = {};
        if (!lookup[gfl][gfh]) lookup[gfl][gfh] = {};
        if (!lookup[gfl][gfh][o2]) lookup[gfl][gfh][o2] = {};
        if (!lookup[gfl][gfh][o2][depth]) lookup[gfl][gfh][o2][depth] = [];

        lookup[gfl][gfh][o2][depth].push({ stopDepth, minDuration });
    }

    const grid = {
        gfl: Array.from(sets.gfl).sort((a, b) => a - b),
        gfh: Array.from(sets.gfh).sort((a, b) => a - b),
        o2: Array.from(sets.o2).sort((a, b) => a - b),
        depth: Array.from(sets.depth).sort((a, b) => a - b)
    };

    return { grid, lookup };
}

function findClosestGFTicks(gfl, gfh, o2, depth) {
    if (!GF_Store) return [];

    const { grid, lookup } = GF_Store;

    // Helper to find floor
    const getFloor = (arr, val) => {
        let best = arr[0];
        for (const v of arr) {
            if (v <= val) best = v;
            else break; // sorted ascending
        }
        return best;
    };

    const tGFL = getFloor(grid.gfl, gfl);
    const tGFH = getFloor(grid.gfh, gfh);
    const tO2 = getFloor(grid.o2, o2);
    const tDepth = getFloor(grid.depth, depth);

    if (lookup[tGFL] &&
        lookup[tGFL][tGFH] &&
        lookup[tGFL][tGFH][tO2] &&
        lookup[tGFL][tGFH][tO2][tDepth]) {
        return lookup[tGFL][tGFH][tO2][tDepth];
    }
    return [];
}


// Expose to window
window.dataManager = {
    loadAllData,
    getMN90: () => MN90_Tables,
    getTable2: () => Table2_N2,
    getTable3: () => Table3_Maj,
    getGFTicks: findClosestGFTicks
};
