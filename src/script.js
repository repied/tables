
// Dives Parameters
let dive1Depth = 40; // meters
let dive1Time = 15; // minutes
let dive2Depth = 40;
let dive2Time = 15;

let initTankPressure = 200; // bar
let sac = 15; // Surface Air consumption l/min
let tankVolume = 15; // liters
let gazO2pct = 21; // Percentage

// GF Mode State
let isGFMode = false;
let currentGFLow = 85;
let currentGFHigh = 85;

// Successive Dive State
let prevGroup = 'A';
let surfaceInterval = 60 * 3; // minutes

// Constants
const MAX_DEPTH = 65;
const MIN_DEPTH = 0;
const MAX_TIME = 240;
const MIN_TIME = 0;

const MAX_TANK_PRESSURE = 250;
const MIN_TANK_PRESSURE = 50;
const MAX_SAC = 30;
const MIN_SAC = 10;
const MAX_TANK_VOLUME = 30;
const MIN_TANK_VOLUME = 6;
const MAX_O2_pct = 50;
const MIN_O2_pct = 21;
const MAX_GF_pct = 100;
const MIN_GF_pct = 10;
const MAX_INTERVAL = 60 * 12; // after 12 hours MN90 assumes a fresh dive
const MIN_INTERVAL = 15; // less 15min MN90 says it's another calculation
const RESERVE_PRESSURE_THRESHOLD = 50; // bar
const PPO2_THRESHOLD = 1.4; // Maximum safe ppO2

// Constant dive parameters
const AIR_FN2 = 0.79;
const SURFACE_PRESSURE = 1; // bar TODO: cahnge for altitude diving?
const ASCENT_RATE = 15; // m/min  15m/min is recommended
const ASCENT_RATE_FROM_FIRST_STOP = 6; // m/min 6m/min is recommended
const DESCENT_RATE = 20; // m/min

// UI Elements
const timeGauge = document.getElementById('time-gauge-container');
const depthGauge = document.getElementById('depth-gauge-container');
const pressureGauge = document.getElementById('pressure-gauge-container');
const sacGauge = document.getElementById('sac-gauge-container');
const volumeGauge = document.getElementById('volume-gauge-container');
const o2Gauge = document.getElementById('o2-gauge-container');

const timeDisplay = document.getElementById('time-display');
const depthDisplay = document.getElementById('depth-display');
const pressureDisplay = document.getElementById('pressure-display');
const sacDisplay = document.getElementById('sac-display');
const volumeDisplay = document.getElementById('volume-display');
const o2Display = document.getElementById('o2-display');

const timeProgress = document.getElementById('time-progress');
const depthProgress = document.getElementById('depth-progress');
const pressureProgress = document.getElementById('pressure-progress');
const sacProgress = document.getElementById('sac-progress');
const volumeProgress = document.getElementById('volume-progress');
const o2Progress = document.getElementById('o2-progress');

// GF Elements
const mn90Toggle = document.getElementById('mode-mn90');
const gfToggle = document.getElementById('mode-gf');

const gfLowGauge = document.getElementById('gf-low-gauge-container');
const gfHighGauge = document.getElementById('gf-high-gauge-container');
const gfLowDisplay = document.getElementById('gf-low-display');
const gfHighDisplay = document.getElementById('gf-high-display');
const gfLowProgress = document.getElementById('gf-low-progress');
const gfHighProgress = document.getElementById('gf-high-progress');

const stopsDisplay = document.getElementById('stops-display');
const diveDetails = document.getElementById('dive-details');

// Successive Elements
const successiveControls = document.getElementById('successive-controls');
const majorationDisplay = document.getElementById('majoration-display');
const successiveHeaderText = document.getElementById('successive-header-text');

// Interval Gauge Elements
const intervalGauge = document.getElementById('interval-gauge-container');
const intervalDisplay = document.getElementById('interval-display');
const intervalProgress = document.getElementById('interval-progress');

// Dive 2 UI Elements
const timeGauge2 = document.getElementById('time-gauge-container-2');
const depthGauge2 = document.getElementById('depth-gauge-container-2');
const timeDisplay2 = document.getElementById('time-display-2');
const depthDisplay2 = document.getElementById('depth-display-2');
const timeProgress2 = document.getElementById('time-progress-2');
const depthProgress2 = document.getElementById('depth-progress-2');
const stopsDisplay2 = document.getElementById('stops-display-2');
const diveDetails2 = document.getElementById('dive-details-2');

// --- BUEHLMANN ALGORITHM ---
const BUEHLMANN = [
    { t12: 5.0, A: 1.1696, B: 0.5578 },
    { t12: 8.0, A: 1.0, B: 0.6514 },
    { t12: 12.5, A: 0.8618, B: 0.7222 },
    { t12: 18.5, A: 0.7562, B: 0.7825 },
    { t12: 27.0, A: 0.62, B: 0.8126 },
    { t12: 38.3, A: 0.5043, B: 0.8434 },
    { t12: 54.3, A: 0.441, B: 0.8693 },
    { t12: 77.0, A: 0.4, B: 0.891 },
    { t12: 109.0, A: 0.375, B: 0.9092 },
    { t12: 146.0, A: 0.35, B: 0.9222 },
    { t12: 187.0, A: 0.3295, B: 0.9319 },
    { t12: 239.0, A: 0.3065, B: 0.9403 },
    { t12: 305.0, A: 0.2835, B: 0.9477 },
    { t12: 390.0, A: 0.261, B: 0.9544 },
    { t12: 498.0, A: 0.248, B: 0.9602 },
    { t12: 635.0, A: 0.2327, B: 0.9653 },
];

const N_COMPARTMENTS = BUEHLMANN.length;
const HALF_LIFES = BUEHLMANN.map(c => c.t12);
const GF_INCREMENT = 5;
const SURFACE_DEPTH = 0;
const MAX_STOP_TIME_BEFORE_INFTY = 720;

function depthToPressure(depth, surfacePressure) {
    return surfacePressure + depth / 10;
}

function depthToPN2(depth, surfacePressure, fN2) {
    return depthToPressure(depth, surfacePressure) * fN2;
}

function updateTension(t0, pn2, t, compartment_t12) {
    const k = Math.log(2) / compartment_t12;
    return pn2 + (t0 - pn2) * Math.exp(-k * t);
}

function updateAllTensions(tensions, PN2, t) {
    return HALF_LIFES.map((t12, i) => updateTension(tensions[i], PN2, t, t12));
}

function getMValue(A, B, pressure) {
    return A + pressure / B;
}

function getModifiedMValue(A, B, pressure, GF) {
    const M_orig = getMValue(A, B, pressure);
    return M_orig * GF + pressure * (1 - GF);
}

function getInterpolatedGF(depth, firstStopDepth, gfLow, gfHigh) {
    if (firstStopDepth === null) {
        return gfLow;
    }
    if (depth >= firstStopDepth) {
        return gfLow;
    }
    if (depth <= 0) {
        return gfHigh;
    }
    const deepRatio = depth / firstStopDepth;
    return gfLow * deepRatio + gfHigh * (1 - deepRatio);
}

function simulAtDepth(depth, tensions, firstStopDepth, gfLow, gfHigh, surfacePressure) {
    const gf = getInterpolatedGF(depth, firstStopDepth, gfLow, gfHigh);
    const p = depthToPressure(depth, surfacePressure);
    let isSafe = true;
    let satsCompIdx = [];
    for (let i = 0; i < N_COMPARTMENTS; i++) {
        const M_mod = getModifiedMValue(BUEHLMANN[i].A, BUEHLMANN[i].B, p, gf);
        if (tensions[i] > M_mod) {
            isSafe = false;
            satsCompIdx.push(i);
        }
    }
    return { isSafe, satsCompIdx };
}

function calculateBuehlmannPlan(diveParams) {
    const {
        bottomTime, maxDepth, gfLow, gfHigh,
        surfacePressure = SURFACE_PRESSURE, stopInterval = 3, lastStopDepth = 3, timeStep = 0.5,
        fN2, initialTensions, ascentRate = ASCENT_RATE, descentRate = DESCENT_RATE
    } = diveParams;

    if (bottomTime <= 0 || maxDepth <= 0) {
        return { dtr: 0, stops: {}, finalTensions: initialTensions || Array(N_COMPARTMENTS).fill(depthToPN2(0, surfacePressure, AIR_FN2)) };
    }

    // Convert gfLow/High to 0-1 if passed as 0-100
    const _gfLow = gfLow > 1 ? gfLow / 100 : gfLow;
    const _gfHigh = gfHigh > 1 ? gfHigh / 100 : gfHigh;

    let firstStopDepth = null;
    // Initial tensions are at equilibrium with Air (PN2 = 0.79 * surfacePressure)
    let tensions = initialTensions ? [...initialTensions] : Array(N_COMPARTMENTS).fill(depthToPN2(0, surfacePressure, AIR_FN2));

    let stopsArr = [];
    let dtr = 0;
    let t_dive_total = 0;

    // 1. Descent
    let currentDepth = 0;
    let nextDepth = currentDepth + descentRate * timeStep;
    while (nextDepth < maxDepth) {
        t_dive_total += timeStep;
        const depthStep = (currentDepth + nextDepth) / 2;
        const PN2Step = depthToPN2(depthStep, surfacePressure, fN2);
        tensions = updateAllTensions(tensions, PN2Step, timeStep);
        currentDepth = nextDepth;
        nextDepth = currentDepth + descentRate * timeStep;
    }
    // Last bit
    let t_last = (maxDepth - currentDepth) / descentRate;
    if (t_last > 0) {
        t_dive_total += t_last;
        const depthLast = (currentDepth + maxDepth) / 2;
        tensions = updateAllTensions(tensions, depthToPN2(depthLast, surfacePressure, fN2), t_last);
        currentDepth = maxDepth;
    }

    // 2. Bottom
    // bottomTime includes descent time
    const t_descent = t_dive_total;
    const t_at_bottom = Math.max(0, bottomTime - t_descent);

    let t_elapsed_bottom = 0;
    while (t_elapsed_bottom < t_at_bottom) {
        let step = Math.min(timeStep, t_at_bottom - t_elapsed_bottom);
        tensions = updateAllTensions(tensions, depthToPN2(currentDepth, surfacePressure, fN2), step);
        t_dive_total += step;
        t_elapsed_bottom += step;
    }

    // 3. Ascent
    while (currentDepth >= lastStopDepth) {
        const remaining_to_laststop = currentDepth - lastStopDepth;
        const n_full_intervals = Math.floor((remaining_to_laststop - 0.00001) / stopInterval);
        let nextDepth = lastStopDepth + stopInterval * n_full_intervals;
        if (currentDepth == lastStopDepth) {
            nextDepth = SURFACE_DEPTH;
        }

        const t_ascend = (currentDepth - nextDepth) / ascentRate;
        const depth_ascend = (nextDepth + currentDepth) / 2;
        const PN2_ascend = depthToPN2(depth_ascend, surfacePressure, fN2);

        let tensions_next = updateAllTensions(tensions, PN2_ascend, t_ascend);

        let { isSafe } = simulAtDepth(nextDepth, tensions_next, firstStopDepth, _gfLow, _gfHigh, surfacePressure);

        if (!isSafe) {
            if (firstStopDepth === null) firstStopDepth = currentDepth;

            let stopTime = 0;
            const PN2_stop = depthToPN2(currentDepth, surfacePressure, fN2);

            while (!isSafe) {
                stopTime += timeStep;
                dtr += timeStep;
                t_dive_total += timeStep;
                tensions = updateAllTensions(tensions, PN2_stop, timeStep);

                // Check if nextDepth is safe now
                tensions_next = updateAllTensions(tensions, PN2_ascend, t_ascend);
                ({ isSafe } = simulAtDepth(nextDepth, tensions_next, firstStopDepth, _gfLow, _gfHigh, surfacePressure));

                if (stopTime > MAX_STOP_TIME_BEFORE_INFTY) break;
            }
            stopsArr.push({ depth: currentDepth, time: stopTime });
        }

        // Ascend
        currentDepth = nextDepth;
        tensions = updateAllTensions(tensions, PN2_ascend, t_ascend);
        dtr += t_ascend;
        t_dive_total += t_ascend;
    }

    // Final ascent to surface from last stop or if no stops
    if (currentDepth > 0) {
        const t_final = currentDepth / ascentRate;
        const depth_final = currentDepth / 2;
        tensions = updateAllTensions(tensions, depthToPN2(depth_final, surfacePressure, fN2), t_final);
        dtr += t_final;
        currentDepth = 0;
    }

    // Convert stops to object
    let stopsObj = {};
    stopsArr.forEach(s => {
        const d = Math.round(s.depth);
        const t = Math.ceil(s.time);
        if (stopsObj[d]) stopsObj[d] += t;
        else stopsObj[d] = t;
    });

    return {
        dtr: Math.ceil(dtr),
        stops: stopsObj,
        finalTensions: tensions
    };
}
// --- END BUEHLMANN ---

// Initialize
async function init() {
    const success = await window.dataManager.loadAllData();
    if (!success) {
        alert("Erreur de chargement des données. Vérifiez la connexion.");
        return;
    }

    initGauges();
    setupInteractions();
}

function initGauges() {
    // Set up initial dasharray for progress rings
    const length = timeProgress.getTotalLength();

    if (!timeProgress || !depthProgress || !pressureProgress || !sacProgress || !volumeProgress || !o2Progress) {
        console.error("Missing gauge elements");
        return;
    }

    [timeProgress, depthProgress, pressureProgress, sacProgress, volumeProgress, o2Progress].forEach(p => {
        p.style.strokeDasharray = length;
        p.style.strokeDashoffset = length;
    });

    if (timeProgress2 && depthProgress2) {
        [timeProgress2, depthProgress2].forEach(p => {
            p.style.strokeDasharray = length;
            p.style.strokeDashoffset = length;
        });
    }

    if (gfLowProgress && gfHighProgress) {
        [gfLowProgress, gfHighProgress].forEach(p => {
            p.style.strokeDasharray = length;
            p.style.strokeDashoffset = length;
        });
    }

    if (intervalProgress) {
        intervalProgress.style.strokeDasharray = length;
        intervalProgress.style.strokeDashoffset = length;
    }

    updateUI();
}

function setupInteractions() {
    setupGaugeInteraction(timeGauge, () => dive1Time, (val) => dive1Time = val, MIN_TIME, MAX_TIME, 0.2);
    setupGaugeInteraction(depthGauge, () => dive1Depth, (val) => dive1Depth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    setupGaugeInteraction(pressureGauge, () => initTankPressure, (val) => initTankPressure = val, MIN_TANK_PRESSURE, MAX_TANK_PRESSURE, 1);
    setupGaugeInteraction(sacGauge, () => sac, (val) => sac = val, MIN_SAC, MAX_SAC, 0.5);
    setupGaugeInteraction(volumeGauge, () => tankVolume, (val) => tankVolume = val, MIN_TANK_VOLUME, MAX_TANK_VOLUME, 1);
    setupGaugeInteraction(o2Gauge, () => gazO2pct, (val) => gazO2pct = val, MIN_O2_pct, MAX_O2_pct, 0.2);

    if (gfLowGauge && gfHighGauge) {
        setupGaugeInteraction(gfLowGauge, () => currentGFLow, (val) => currentGFLow = val, MIN_GF_pct, MAX_GF_pct, 0.5);
        setupGaugeInteraction(gfHighGauge, () => currentGFHigh, (val) => currentGFHigh = val, MIN_GF_pct, MAX_GF_pct, 0.5);
    }

    if (mn90Toggle && gfToggle) {
        mn90Toggle.addEventListener('change', () => {
            isGFMode = false;
            updateUI();
        });
        gfToggle.addEventListener('change', () => {
            isGFMode = true;
            updateUI();
        });
    }

    if (timeGauge2 && depthGauge2) {
        setupGaugeInteraction(timeGauge2, () => dive2Time, (val) => dive2Time = val, MIN_TIME, MAX_TIME, 0.2);
        setupGaugeInteraction(depthGauge2, () => dive2Depth, (val) => dive2Depth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    }

    if (intervalGauge) {
        setupGaugeInteraction(intervalGauge, () => surfaceInterval, (val) => surfaceInterval = val, MIN_INTERVAL, MAX_INTERVAL, 1);
    }
}


// Interaction Logic
function setupGaugeInteraction(gaugeElement, getValue, setValue, min, max, sensitivity = 0.5) {
    let startY = 0;
    let startValue = 0;
    let isDragging = false;

    gaugeElement.addEventListener('pointerdown', (e) => {
        // console.log('pointerdown on', gaugeElement.id);
        isDragging = true;
        startY = e.clientY;
        startValue = getValue();
        gaugeElement.setPointerCapture(e.pointerId);
        gaugeElement.style.cursor = 'ns-resize';
    });

    gaugeElement.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        // console.log('pointermove', gaugeElement.id);
        const deltaY = startY - e.clientY;
        const change = Math.round(deltaY * sensitivity);
        let newValue = startValue + change;
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;
        if (newValue !== getValue()) {
            setValue(newValue);
            updateUI();
        }
    });

    gaugeElement.addEventListener('pointerup', (e) => {
        isDragging = false;
        gaugeElement.style.cursor = 'default';
        gaugeElement.releasePointerCapture(e.pointerId);
    });

    gaugeElement.addEventListener('pointercancel', (e) => {
        isDragging = false;
        gaugeElement.style.cursor = 'default';
    });
}

// Calculation Logic
function getMN90Profile(depth, time) {
    const MN90 = window.dataManager.getMN90();
    const tableDepths = Object.keys(MN90).map(Number).sort((a, b) => a - b);
    let targetDepth = tableDepths.find(d => d >= depth);

    if (!targetDepth && depth > 0) {
        if (depth <= tableDepths[tableDepths.length - 1]) {
            // Should have been found.
        } else {
            return null; // Too deep
        }
    }

    if (depth <= 0) return { stops: {}, note: "Surface" };
    if (!targetDepth) return null;

    const profiles = MN90[targetDepth];

    // Find profile with time >= time
    let profile = profiles.find(p => p.time >= time);

    if (!profile) {
        return { error: "Hors table" };
    }

    return {
        tableDepth: targetDepth,
        profile: profile
    };
}

// Formatting
function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

function calculateGasConsumption(depth, time, profile) {
    if (depth <= 0) return 0;

    // 1. Bottom Gas (Uses actual bottom time)
    // Note: profile might be based on Time + Majoration, but gas is consumed based on Actual Time.
    // However, stops are based on profile.

    const bottomPressure = 1 + depth / 10;
    const bottomGas = time * bottomPressure * sac;

    // 2. Ascent Gas
    let ascentGas = 0;
    const ascentSpeed = 15;
    const stops = profile ? profile.stops : {};

    const stopDepths = Object.keys(stops).map(Number).sort((a, b) => b - a);
    const firstTargetDepth = stopDepths.length > 0 ? stopDepths[0] : 0;

    // Ascent from bottom to first target
    if (depth > firstTargetDepth) {
        const travelTime = (depth - firstTargetDepth) / ascentSpeed;
        const avgPressure = 1 + (depth + firstTargetDepth) / 20;
        ascentGas += travelTime * avgPressure * sac;
    }


    stopDepths.forEach((d, i) => {
        const stopDuration = stops[d];
        const stopPressure = 1 + d / 10;
        ascentGas += stopDuration * stopPressure * sac;

        const nextTarget = (i + 1 < stopDepths.length) ? stopDepths[i + 1] : 0;
        const segmentSpeed = 6;

        const travelTime = (d - nextTarget) / segmentSpeed;
        const avgPressure = 1 + (d + nextTarget) / 20;
        ascentGas += travelTime * avgPressure * sac;
    });

    return Math.ceil(bottomGas + ascentGas);
}

// Helper to render stops
function renderStops(result, containerElement) {
    containerElement.innerHTML = '';

    if (!result) {
        containerElement.innerHTML = '<div class="placeholder-text">Profond. max dépassée</div>';
        return;
    }

    if (result.error) {
        containerElement.innerHTML = '<div class="placeholder-text">Hors table</div>';
        return;
    }

    if (result.note === "Surface") {
        containerElement.innerHTML = '<div class="placeholder-text">Surface</div>';
        return;
    }

    const { stops } = result.profile;
    const depths = [15, 12, 9, 6, 3];

    depths.forEach(d => {
        const stopEl = document.createElement('div');
        stopEl.className = 'stop-item';

        let visualContent = '';
        if (stops[d]) {
            stopEl.classList.add('active');
            visualContent = `<div class="stop-time">${stops[d]}</div>`;
        } else {
            visualContent = `<div class="stop-dot"></div>`;
        }

        const lineHeight = (d * 5);

        stopEl.innerHTML = `
            <div class="stop-depth">${d}m</div>
            <div class="stop-line" style="height: ${lineHeight}px"></div>
            <div class="stop-value-container">
                ${visualContent}
            </div>
        `;
        containerElement.appendChild(stopEl);
    });
}

function calculateDTR(depth, stops) {
    let dtr = 0;
    const stopDepths = Object.keys(stops).map(Number).sort((a, b) => b - a);
    let hasStops = stopDepths.length > 0;
    let totalStopTime = 0;
    for (let d in stops) totalStopTime += stops[d];

    if (!hasStops) {
        const ascentTime = depth / ASCENT_RATE;
        dtr = Math.ceil(ascentTime);
    } else {
        const firstStopDepth = stopDepths[0];
        const ascentToFirst = (depth - firstStopDepth) / ASCENT_RATE;
        const ascentFromFirst = firstStopDepth / ASCENT_RATE_FROM_FIRST_STOP;
        const totalAscentAndStops = ascentToFirst + totalStopTime + ascentFromFirst;
        dtr = Math.ceil(totalAscentAndStops);
    }
    return dtr;
}

// Nitrox Helpers
function calculateEAD(depth, o2) {
    if (o2 <= 21) return depth;
    const fN2 = (100 - o2) / 100;
    const ead = ((depth + 10) * fN2 / 0.79) - 10;
    return Math.max(0, ead);
}

function calculatePPO2(depth, o2) {
    return (1 + depth / 10) * (o2 / 100);
}

// Update UI
function updateUI() {
    document.body.classList.toggle('gf-mode', isGFMode);

    // -------------------------
    // DIVE 1 CALCULATION
    // -------------------------

    // Update Values
    timeDisplay.textContent = formatTime(dive1Time);
    depthDisplay.textContent = dive1Depth;
    pressureDisplay.textContent = initTankPressure;
    sacDisplay.textContent = sac;
    volumeDisplay.textContent = tankVolume;
    o2Display.textContent = gazO2pct;

    // Update Gauges Progress
    const length = timeProgress.getTotalLength();
    timeProgress.style.strokeDashoffset = length * (1 - Math.min(dive1Time / 60, 1));
    depthProgress.style.strokeDashoffset = length * (1 - Math.min(dive1Depth / 60, 1));
    pressureProgress.style.strokeDashoffset = length * (1 - Math.min(initTankPressure / MAX_TANK_PRESSURE, 1));
    sacProgress.style.strokeDashoffset = length * (1 - Math.min(sac / MAX_SAC, 1));
    volumeProgress.style.strokeDashoffset = length * (1 - Math.min(tankVolume / MAX_TANK_VOLUME, 1));
    o2Progress.style.strokeDashoffset = length * (1 - Math.min((gazO2pct) / 50, 1));

    // Update GF Gauges
    gfLowDisplay.textContent = currentGFLow;
    gfHighDisplay.textContent = currentGFHigh;
    gfLowProgress.style.strokeDashoffset = length * (1 - Math.min(currentGFLow / 100, 1));
    gfHighProgress.style.strokeDashoffset = length * (1 - Math.min(currentGFHigh / 100, 1));

    // Nitrox Calcs
    const ead1 = calculateEAD(dive1Depth, gazO2pct);
    const ppo2_1 = calculatePPO2(dive1Depth, gazO2pct);
    const isNitrox = gazO2pct > 21;

    let result1;
    let dtr1;
    let finalTensions1 = null;

    if (isGFMode) {
        // Buehlmann Algo
        const fN2 = (100 - gazO2pct) / 100;
        const res_bu_1 = calculateBuehlmannPlan({
            bottomTime: dive1Time,
            maxDepth: dive1Depth,
            gfLow: currentGFLow,
            gfHigh: currentGFHigh,
            fN2: fN2
        });
        result1 = {
            profile: { stops: res_bu_1.stops, group: 'GF_GPS' },
            note: ''
        };
        dtr1_buhlmann = res_bu_1.dtr;
        dtr1 = calculateDTR(dive1Depth, result1.profile.stops);
        // console.log("Dive 1: Buehlmann DTR:", dtr1_buhlmann, "Calculated DTR:", dtr1);
        finalTensions1 = res_bu_1.finalTensions;
    } else {
        // Calculate Profile (Use EAD for Dive 1)
        result1 = getMN90Profile(ead1, dive1Time);
        if (result1 && !result1.error && result1.note !== "Surface") {
            dtr1 = calculateDTR(dive1Depth, result1.profile.stops);
        }
    }

    // Render Dive 1 Stops
    renderStops(result1, stopsDisplay);

    // Dive 1 Details
    diveDetails.innerHTML = '';
    let gps1 = null;

    if (result1 && !result1.error && result1.note !== "Surface") {
        gps1 = result1.profile.group;
        const stops = result1.profile.stops;

        // DTR
        // dtr is already calculated above
        const dtrFormatted = formatTime(dtr1);

        // Gas
        const gasUsed = calculateGasConsumption(dive1Depth, dive1Time, result1.profile);
        const pressureUsed = gasUsed / tankVolume;
        const remainingPressure = Math.floor(initTankPressure - pressureUsed);

        const gpsText = (gps1 === 'GF_GPS') ? '' : (gps1 ? `gps ${gps1}` : 'gps -');
        const reserveText = `réserve <strong>${remainingPressure}</strong> bar`;
        let nitroxText = '';
        if (isNitrox) {
            nitroxText = ` • ppO2 <strong>${ppo2_1.toFixed(2)}</strong>`;
        }

        diveDetails.innerHTML = `${gpsText ? gpsText + ' • ' : ''}dtr <strong>${dtrFormatted}</strong> • ${reserveText}${nitroxText}`;

        if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_1 > 1.6) {
            diveDetails.style.color = '#e53935';
        } else if (ppo2_1 > PPO2_THRESHOLD) {
            diveDetails.style.color = '#ff9800'; // Orange warning
        } else {
            diveDetails.style.color = '#fff';
        }
    } else if (result1 && result1.error) {
        diveDetails.textContent = "Hors table";
    }

    // Update Successive Header Text with GPS
    if (successiveHeaderText) {
        successiveHeaderText.textContent = `Seconde plongée`;
    }

    // -----------------------------------------------------------------------------------------------------------------------------
    // DIVE 2 CALCULATION
    // -----------------------------------------------------------------------------------------------------------------------------

    // Auto-update Group from Dive 1 if valid
    if (gps1) {
        prevGroup = gps1;
    }

    // Dive 2 Nitrox Calcs
    // Assuming same mix for now
    const ead2 = calculateEAD(dive2Depth, gazO2pct);
    const ppo2_2 = calculatePPO2(dive2Depth, gazO2pct);

    // Calculate Majoration using EAD2
    const succResult = calculateSuccessive(prevGroup, surfaceInterval, ead2);

    // Update Interval Gauge
    if (intervalDisplay) intervalDisplay.textContent = formatTime(surfaceInterval);
    if (intervalProgress) intervalProgress.style.strokeDashoffset = length * (1 - Math.min(surfaceInterval / MAX_INTERVAL, 1));

    // Update Dive 2 Values & Gauges
    if (timeDisplay2) timeDisplay2.textContent = formatTime(dive2Time);
    if (depthDisplay2) depthDisplay2.textContent = dive2Depth;

    if (timeProgress2) timeProgress2.style.strokeDashoffset = length * (1 - Math.min(dive2Time / 60, 1));
    if (depthProgress2) depthProgress2.style.strokeDashoffset = length * (1 - Math.min(dive2Depth / 60, 1));

    // Calculate Dive 2 Profile
    // Total Duration = Real Time + Majoration
    // Use EAD2 for Profile Lookup
    let result2;
    let dtr2;


    if (isGFMode) {

        if (majorationDisplay) {
            const avgTension = finalTensions1 ? (finalTensions1.reduce((a, b) => a + b, 0) / finalTensions1.length).toFixed(2) : '-';
            const tensionsStr = finalTensions1 ? finalTensions1.map(t => t.toFixed(2)).join(', ') : '-';
            majorationDisplay.textContent = `Variation ppN2 compartiments ${avgTension} bar -> `;
        }
        // Buehlmann Algo for Dive 2 with residual nitrogen
        const fN2 = (100 - gazO2pct) / 100;

        // Surface interval evolution
        let currentTensions = finalTensions1;
        if (currentTensions) {
            const surfacePN2 = depthToPN2(0, SURFACE_PRESSURE, AIR_FN2); // Air at surface
            currentTensions = updateAllTensions(currentTensions, surfacePN2, surfaceInterval);
        }

        if (majorationDisplay) {
            const displayTensions = currentTensions || finalTensions1;
            const avgTension = displayTensions ? (displayTensions.reduce((a, b) => a + b, 0) / displayTensions.length).toFixed(2) : '-';
            const tensionsStr = displayTensions ? displayTensions.map(t => t.toFixed(2)).join(', ') : '-';
            majorationDisplay.textContent += `${avgTension} bar`;
        }

        // Dive 2 Simulation
        const res2 = calculateBuehlmannPlan({
            bottomTime: dive2Time,
            maxDepth: dive2Depth,
            gfLow: currentGFLow,
            gfHigh: currentGFHigh,
            fN2: fN2,
            initialTensions: currentTensions
        });

        result2 = {
            profile: { stops: res2.stops, group: '-' },
            note: ''
        };
        dtr2_buhlmann = res2.dtr;
        dtr2 = calculateDTR(dive2Depth, result2.profile.stops);
        // console.log("Dive 2: Buehlmann DTR:", dtr2_buhlmann, "Calculated DTR:", dtr2);
    } else {
        let majText = "Err";
        let currentMajoration = 0;

        if (succResult && !succResult.error) {
            currentMajoration = succResult.majoration;
            majText = `+${currentMajoration} min (GPS ${gps1})`;
        } else if (succResult && succResult.error) {
            majText = "Err"; // e.g. interval too short
        }

        if (majorationDisplay) {
            majorationDisplay.textContent = `Majoration: ${majText} `;
        }

        const effectiveTime2 = dive2Time + currentMajoration;
        result2 = getMN90Profile(ead2, effectiveTime2);
        if (result2 && !result2.error && result2.note !== "Surface") {
            dtr2 = calculateDTR(dive2Depth, result2.profile.stops);
        }
    }

    renderStops(result2, stopsDisplay2);

    // Dive 2 Details
    if (diveDetails2) {
        diveDetails2.innerHTML = '';
        if (result2 && !result2.error && result2.note !== "Surface") {
            const stops = result2.profile.stops;

            // DTR
            const dtr = dtr2;
            const dtrFormatted = formatTime(dtr);

            // Gas (Assume fresh tank with currentPressure and currentVolume)
            // Use Actual Time (dive2Time) for bottom consumption
            const gasUsed = calculateGasConsumption(dive2Depth, dive2Time, result2.profile);
            const pressureUsed = gasUsed / tankVolume;
            const remainingPressure = Math.round(initTankPressure - pressureUsed);

            const reserveText = `réserve <strong>${remainingPressure}</strong> bar`;
            let nitroxText2 = '';
            if (isNitrox) {
                nitroxText2 = ` • ppO2 <strong>${ppo2_2.toFixed(2)}</strong>`;
            }

            diveDetails2.innerHTML = `dtr <strong>${dtrFormatted}</strong> • ${reserveText}${nitroxText2}`;

            if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_2 > 1.6) {
                diveDetails2.style.color = '#e53935';
            } else if (ppo2_2 > PPO2_THRESHOLD) {
                diveDetails2.style.color = '#ff9800';
            } else {
                diveDetails2.style.color = '#fff';
            }
        } else if (result2 && result2.error) {
            diveDetails2.textContent = "Hors table";
        }
    }

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

// Start
document.addEventListener('DOMContentLoaded', init);
