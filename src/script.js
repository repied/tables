// State
let currentDepth = 40; // meters
let currentTime = 25; // minutes
let currentPressure = 200; // bar
let currentSAC = 20; // l/min
let currentVolume = 15; // liters
let currentO2 = 21; // Percentage

// Dive 2 State
let dive2Depth = 20;
let dive2Time = 30;

// Successive Dive State
let isSuccessiveMode = true;
let prevGroup = 'A';
let surfaceInterval = 60; // minutes
let currentMajoration = 0;

// Constants
const MAX_DEPTH = 65;
const MIN_DEPTH = 0;
const MAX_TIME = 240;
const MIN_TIME = 0;

const MAX_PRESSURE = 300;
const MIN_PRESSURE = 0;
const MAX_SAC = 30;
const MIN_SAC = 10;
const MAX_VOLUME = 30;
const MIN_VOLUME = 6;
const MAX_O2 = 40;
const MIN_O2 = 21;
const MAX_INTERVAL = 720; // 12h
const MIN_INTERVAL = 15; // 15min
const RESERVE_PRESSURE_THRESHOLD = 50; // bar
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


// Initialize
async function init() {
    console.log("Loading data...");
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

    if (intervalProgress) {
        intervalProgress.style.strokeDasharray = length;
        intervalProgress.style.strokeDashoffset = length;
    }

    updateUI();
}

function setupInteractions() {
    setupInteraction(timeGauge, () => currentTime, (val) => currentTime = val, MIN_TIME, MAX_TIME, 0.2);
    setupInteraction(depthGauge, () => currentDepth, (val) => currentDepth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    setupInteraction(pressureGauge, () => currentPressure, (val) => currentPressure = val, MIN_PRESSURE, MAX_PRESSURE, 1);
    setupInteraction(sacGauge, () => currentSAC, (val) => currentSAC = val, MIN_SAC, MAX_SAC, 0.5);
    setupInteraction(volumeGauge, () => currentVolume, (val) => currentVolume = val, MIN_VOLUME, MAX_VOLUME, 1);
    setupInteraction(o2Gauge, () => currentO2, (val) => currentO2 = val, MIN_O2, MAX_O2, 0.2);

    console.log("Setting up Dive 2 interactions. Found:", !!timeGauge2, !!depthGauge2);
    if (timeGauge2 && depthGauge2) {
        setupInteraction(timeGauge2, () => dive2Time, (val) => dive2Time = val, MIN_TIME, MAX_TIME, 0.2);
        setupInteraction(depthGauge2, () => dive2Depth, (val) => dive2Depth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    }

    if (intervalGauge) {
        setupInteraction(intervalGauge, () => surfaceInterval, (val) => surfaceInterval = val, MIN_INTERVAL, MAX_INTERVAL, 1);
    }
}


// Interaction Logic
function setupInteraction(element, getValue, setValue, min, max, sensitivity = 0.5) {
    let startY = 0;
    let startValue = 0;
    let isDragging = false;

    element.addEventListener('pointerdown', (e) => {
        console.log('pointerdown on', element.id);
        isDragging = true;
        startY = e.clientY;
        startValue = getValue();
        element.setPointerCapture(e.pointerId);
        element.style.cursor = 'ns-resize';
    });

    element.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        console.log('pointermove', element.id);
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

    element.addEventListener('pointerup', (e) => {
        isDragging = false;
        element.style.cursor = 'default';
        element.releasePointerCapture(e.pointerId);
    });

    element.addEventListener('pointercancel', (e) => {
        isDragging = false;
        element.style.cursor = 'default';
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
    const bottomGas = time * bottomPressure * currentSAC;

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
        ascentGas += travelTime * avgPressure * currentSAC;
    }

    let currentStopDepth = firstTargetDepth;

    stopDepths.forEach((d, i) => {
        const stopDuration = stops[d];
        const stopPressure = 1 + d / 10;
        ascentGas += stopDuration * stopPressure * currentSAC;

        const nextTarget = (i + 1 < stopDepths.length) ? stopDepths[i + 1] : 0;
        const segmentSpeed = 6;

        const travelTime = (d - nextTarget) / segmentSpeed;
        const avgPressure = 1 + (d + nextTarget) / 20;
        ascentGas += travelTime * avgPressure * currentSAC;

        currentStopDepth = nextTarget;
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
        const ascentTime = depth / 15;
        dtr = Math.ceil(ascentTime);
    } else {
        const firstStopDepth = stopDepths[0];
        const ascentToFirst = (depth - firstStopDepth) / 15;
        const ascentFromFirst = firstStopDepth / 6;
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
    // -------------------------
    // DIVE 1 CALCULATION
    // -------------------------

    // Update Values
    timeDisplay.textContent = formatTime(currentTime);
    depthDisplay.textContent = currentDepth;
    pressureDisplay.textContent = currentPressure;
    sacDisplay.textContent = currentSAC;
    volumeDisplay.textContent = currentVolume;
    o2Display.textContent = currentO2;

    // Update Gauges Progress
    const length = timeProgress.getTotalLength();
    timeProgress.style.strokeDashoffset = length * (1 - Math.min(currentTime / 60, 1));
    depthProgress.style.strokeDashoffset = length * (1 - Math.min(currentDepth / 60, 1));
    pressureProgress.style.strokeDashoffset = length * (1 - Math.min(currentPressure / MAX_PRESSURE, 1));
    sacProgress.style.strokeDashoffset = length * (1 - Math.min(currentSAC / MAX_SAC, 1));
    volumeProgress.style.strokeDashoffset = length * (1 - Math.min(currentVolume / MAX_VOLUME, 1));
    o2Progress.style.strokeDashoffset = length * (1 - Math.min((currentO2) / 50, 1));

    // Nitrox Calcs
    const ead1 = calculateEAD(currentDepth, currentO2);
    const ppo2_1 = calculatePPO2(currentDepth, currentO2);
    const isNitrox = currentO2 > 21;

    // Calculate Profile (Use EAD for Dive 1)
    const result1 = getMN90Profile(ead1, currentTime);

    // Render Dive 1 Stops
    renderStops(result1, stopsDisplay);

    // Dive 1 Details
    diveDetails.innerHTML = '';
    let gps1 = null;

    if (result1 && !result1.error && result1.note !== "Surface") {
        gps1 = result1.profile.group;
        const stops = result1.profile.stops;

        // DTR
        const dtr = calculateDTR(currentDepth, stops);
        const dtrFormatted = formatTime(dtr);

        // Gas
        const gasUsed = calculateGasConsumption(currentDepth, currentTime, result1.profile);
        const pressureUsed = gasUsed / currentVolume;
        const remainingPressure = Math.round(currentPressure - pressureUsed);

        const gpsText = gps1 ? `gps ${gps1}` : 'gps -';
        const reserveText = `réserve <strong>${remainingPressure}</strong> bar`;
        let nitroxText = '';
        if (isNitrox) {
            nitroxText = ` • ppO2 <strong>${ppo2_1.toFixed(2)}</strong>`;
        }

        diveDetails.innerHTML = `${gpsText} • dtr <strong>${dtrFormatted}</strong> • ${reserveText}${nitroxText}`;

        if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_1 > 1.6) {
            diveDetails.style.color = '#e53935';
        } else if (ppo2_1 > 1.4) {
            diveDetails.style.color = '#ff9800'; // Orange warning
        } else {
            diveDetails.style.color = '#fff';
        }
    } else if (result1 && result1.error) {
        diveDetails.textContent = "Hors table";
    }

    // Update Successive Header Text with GPS
    if (successiveHeaderText) {
        if (gps1) {
            successiveHeaderText.textContent = `Seconde plongée (GPS ${gps1})`;
        } else {
            successiveHeaderText.textContent = `Seconde plongée`;
        }
    }

    // -------------------------
    // DIVE 2 CALCULATION
    // -------------------------

    if (isSuccessiveMode) {
        // Auto-update Group from Dive 1 if valid
        if (gps1) {
            prevGroup = gps1;
        }

        // Dive 2 Nitrox Calcs
        // Assuming same mix for now
        const ead2 = calculateEAD(dive2Depth, currentO2);
        const ppo2_2 = calculatePPO2(dive2Depth, currentO2);

        // Calculate Majoration using EAD2
        const succResult = window.dataManager.calculateSuccessive(prevGroup, surfaceInterval, ead2);

        let majText = "Err";
        currentMajoration = 0;

        if (succResult && !succResult.error) {
            currentMajoration = succResult.majoration;
            majText = `+${currentMajoration} min`;
        } else if (succResult && succResult.error) {
            majText = "Err"; // e.g. interval too short
        }

        if (majorationDisplay) {
            majorationDisplay.textContent = `Majoration: ${majText}`;
        }

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
        const effectiveTime2 = dive2Time + currentMajoration;
        const result2 = getMN90Profile(ead2, effectiveTime2);

        renderStops(result2, stopsDisplay2);

        // Dive 2 Details
        if (diveDetails2) {
            diveDetails2.innerHTML = '';
            if (result2 && !result2.error && result2.note !== "Surface") {
                const stops = result2.profile.stops;

                // DTR
                const dtr = calculateDTR(dive2Depth, stops);
                const dtrFormatted = formatTime(dtr);

                // Gas (Assume fresh tank with currentPressure and currentVolume)
                // Use Actual Time (dive2Time) for bottom consumption
                const gasUsed = calculateGasConsumption(dive2Depth, dive2Time, result2.profile);
                const pressureUsed = gasUsed / currentVolume;
                const remainingPressure = Math.round(currentPressure - pressureUsed);

                const reserveText = `réserve <strong>${remainingPressure}</strong> bar`;
                let nitroxText2 = '';
                if (isNitrox) {
                    nitroxText2 = ` • ppO2 <strong>${ppo2_2.toFixed(2)}</strong>`;
                }

                diveDetails2.innerHTML = `dtr <strong>${dtrFormatted}</strong> • ${reserveText}${nitroxText2}`;

                if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_2 > 1.6) {
                    diveDetails2.style.color = '#e53935';
                } else if (ppo2_2 > 1.4) {
                    diveDetails2.style.color = '#ff9800';
                } else {
                    diveDetails2.style.color = '#fff';
                }
            } else if (result2 && result2.error) {
                diveDetails2.textContent = "Hors table";
            }
        }
    }
}


// Start
document.addEventListener('DOMContentLoaded', init);
