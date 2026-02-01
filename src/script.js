// State
let currentDepth = 40; // meters
let currentTime = 25; // minutes
let currentPressure = 200; // bar
let currentSAC = 20; // l/min
let currentVolume = 15; // liters

// Successive Dive State
let isSuccessiveMode = false;
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
const MIN_SAC = 5;
const MAX_VOLUME = 20;
const MIN_VOLUME = 6;

// UI Elements
const timeGauge = document.getElementById('time-gauge-container');
const depthGauge = document.getElementById('depth-gauge-container');
const pressureGauge = document.getElementById('pressure-gauge-container');
const sacGauge = document.getElementById('sac-gauge-container');
const volumeGauge = document.getElementById('volume-gauge-container');

const timeDisplay = document.getElementById('time-display');
const depthDisplay = document.getElementById('depth-display');
const pressureDisplay = document.getElementById('pressure-display');
const sacDisplay = document.getElementById('sac-display');
const volumeDisplay = document.getElementById('volume-display');

const timeProgress = document.getElementById('time-progress');
const depthProgress = document.getElementById('depth-progress');
const pressureProgress = document.getElementById('pressure-progress');
const sacProgress = document.getElementById('sac-progress');
const volumeProgress = document.getElementById('volume-progress');

const stopsDisplay = document.getElementById('stops-display');
const diveDetails = document.getElementById('dive-details');

// Successive Elements
const successiveToggle = document.getElementById('successive-mode-toggle');
const successiveControls = document.getElementById('successive-controls');
const prevGroupSelect = document.getElementById('prev-group-select');
const intervalInput = document.getElementById('interval-input');
const majorationDisplay = document.getElementById('majoration-display');


// Initialize
async function init() {
    console.log("Loading data...");
    const success = await window.dataManager.loadAllData();
    if (!success) {
        alert("Erreur de chargement des données. Vérifiez la connexion.");
        return;
    }

    initGauges();
    initSuccessiveControls();
    setupInteractions();
}

function initGauges() {
    // Set up initial dasharray for progress rings
    const length = timeProgress.getTotalLength();

    if (!timeProgress || !depthProgress || !pressureProgress || !sacProgress || !volumeProgress) {
        console.error("Missing gauge elements");
        return;
    }

    [timeProgress, depthProgress, pressureProgress, sacProgress, volumeProgress].forEach(p => {
        p.style.strokeDasharray = length;
        p.style.strokeDashoffset = length;
    });

    updateUI();
}

function initSuccessiveControls() {
    if (!successiveToggle) return;

    // Populate Group Select
    const groups = 'ABCDEFGHIJKLMNOP'.split('');
    prevGroupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
    prevGroupSelect.value = prevGroup;
    intervalInput.value = surfaceInterval;

    // Toggle Handler
    successiveToggle.addEventListener('change', (e) => {
        isSuccessiveMode = e.target.checked;
        successiveControls.style.display = isSuccessiveMode ? 'flex' : 'none';
        updateUI();
    });

    // Inputs Handler
    prevGroupSelect.addEventListener('change', (e) => {
        prevGroup = e.target.value;
        updateUI();
    });

    intervalInput.addEventListener('input', (e) => {
        surfaceInterval = parseInt(e.target.value) || 0;
        updateUI();
    });
}

function setupInteractions() {
    setupInteraction(timeGauge, () => currentTime, (val) => currentTime = val, MIN_TIME, MAX_TIME, 0.2);
    setupInteraction(depthGauge, () => currentDepth, (val) => currentDepth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    setupInteraction(pressureGauge, () => currentPressure, (val) => currentPressure = val, MIN_PRESSURE, MAX_PRESSURE, 1);
    setupInteraction(sacGauge, () => currentSAC, (val) => currentSAC = val, MIN_SAC, MAX_SAC, 0.5);
    setupInteraction(volumeGauge, () => currentVolume, (val) => currentVolume = val, MIN_VOLUME, MAX_VOLUME, 1);
}

// Interaction Logic
function setupInteraction(element, getValue, setValue, min, max, sensitivity = 0.5) {
    let startY = 0;
    let startValue = 0;
    let isDragging = false;

    element.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startValue = getValue();
        element.setPointerCapture(e.pointerId);
        element.style.cursor = 'ns-resize';
    });

    element.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
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

// Update UI
function updateUI() {
    // 1. Calculate Majoration if in Successive Mode
    let effectiveTime = currentTime;
    let majText = "+0 min";

    if (isSuccessiveMode) {
        const result = window.dataManager.calculateSuccessive(prevGroup, surfaceInterval, currentDepth);
        if (result.error) {
            majText = "Err";
            currentMajoration = 0;
        } else {
            currentMajoration = result.majoration;
            majText = `+${currentMajoration} min`;
            effectiveTime += currentMajoration;
        }
    } else {
        currentMajoration = 0;
    }

    if (majorationDisplay) {
        majorationDisplay.textContent = `Majoration: ${majText}`;
    }

    // 2. Update Values
    timeDisplay.textContent = formatTime(currentTime);
    depthDisplay.textContent = currentDepth;
    pressureDisplay.textContent = currentPressure;
    sacDisplay.textContent = currentSAC;
    volumeDisplay.textContent = currentVolume;

    // 3. Update Gauges Progress
    const length = timeProgress.getTotalLength();
    timeProgress.style.strokeDashoffset = length * (1 - Math.min(currentTime / 60, 1));
    depthProgress.style.strokeDashoffset = length * (1 - Math.min(currentDepth / 60, 1));
    pressureProgress.style.strokeDashoffset = length * (1 - Math.min(currentPressure / MAX_PRESSURE, 1));
    sacProgress.style.strokeDashoffset = length * (1 - Math.min(currentSAC / MAX_SAC, 1));
    volumeProgress.style.strokeDashoffset = length * (1 - Math.min(currentVolume / MAX_VOLUME, 1));

    // 4. Calculate Profile using Effective Time
    const result = getMN90Profile(currentDepth, effectiveTime);

    stopsDisplay.innerHTML = '';
    diveDetails.innerHTML = '';

    if (!result) {
        stopsDisplay.innerHTML = '<div class="placeholder-text">Profond. max dépassée</div>';
        return;
    }

    if (result.error) {
        stopsDisplay.innerHTML = '<div class="placeholder-text">Hors table</div>';
        return;
    }

    if (result.note === "Surface") {
        stopsDisplay.innerHTML = '<div class="placeholder-text">Surface</div>';
        return;
    }

    const { stops, group } = result.profile;

    // 5. Render Stops
    const depths = [15, 12, 9, 6, 3];
    let hasStops = false;
    let totalStopTime = 0;
    let firstStopDepth = 0;

    depths.forEach(d => {
        if (stops[d]) {
            if (!hasStops) firstStopDepth = d;
            hasStops = true;
            totalStopTime += stops[d];
        }
    });

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
        stopsDisplay.appendChild(stopEl);
    });

    // 6. Calculate DTR
    let dtr = 0;
    if (!hasStops) {
        const ascentTime = currentDepth / 15;
        dtr = Math.ceil(ascentTime);
    } else {
        const ascentToFirst = (currentDepth - firstStopDepth) / 15;
        const ascentFromFirst = firstStopDepth / 6;
        const totalAscentAndStops = ascentToFirst + totalStopTime + ascentFromFirst;
        dtr = Math.round(totalAscentAndStops);
    }

    // 7. Calculate Gas (Use Actual Time, not Effective Time)
    const gasUsed = calculateGasConsumption(currentDepth, currentTime, result.profile);
    const pressureUsed = gasUsed / currentVolume;
    const remainingPressure = Math.round(currentPressure - pressureUsed);

    // 8. Update Details
    const dtrFormatted = formatTime(dtr);
    const gpsText = group ? `gps ${group}` : 'gps -';
    const reserveText = `réserve ${remainingPressure} bar`;

    diveDetails.textContent = `${gpsText} • dtr ${dtrFormatted} • ${reserveText}`;

    if (remainingPressure < 50) {
        diveDetails.style.color = '#e53935';
    } else {
        diveDetails.style.color = '#fff'; // White for better visibility against blur
    }
}


// Start
document.addEventListener('DOMContentLoaded', init);
