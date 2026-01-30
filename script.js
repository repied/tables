// State
let currentDepth = 40; // meters
let currentTime = 25; // minutes
let currentPressure = 200; // bar
let currentSAC = 20; // l/min
let currentVolume = 15; // liters

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

// MN90 Data is available via MN90 global variable

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

// Initialize Gauges
function initGauges() {
    // Set up initial dasharray for progress rings
    const length = timeProgress.getTotalLength();

    // Check if elements exist
    if (!timeProgress || !depthProgress || !pressureProgress || !sacProgress || !volumeProgress) {
        console.error("Missing gauge elements");
        return;
    }

    [timeProgress, depthProgress, pressureProgress, sacProgress, volumeProgress].forEach(p => {
        p.style.strokeDasharray = length;
        p.style.strokeDashoffset = length;
    });

    console.log("Gauges initialized");
    updateUI();
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

        const deltaY = startY - e.clientY; // Drag UP is positive
        const change = Math.round(deltaY * sensitivity);

        let newValue = startValue + change;

        // Clamp
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

// Setup interactions
setupInteraction(
    timeGauge,
    () => currentTime,
    (val) => currentTime = val,
    MIN_TIME,
    MAX_TIME,
    0.2 // Sensitivity for time
);

setupInteraction(
    depthGauge,
    () => currentDepth,
    (val) => currentDepth = val,
    MIN_DEPTH,
    MAX_DEPTH,
    0.1 // Sensitivity for depth
);

setupInteraction(
    pressureGauge,
    () => currentPressure,
    (val) => currentPressure = val,
    MIN_PRESSURE,
    MAX_PRESSURE,
    1
);

setupInteraction(
    sacGauge,
    () => currentSAC,
    (val) => currentSAC = val,
    MIN_SAC,
    MAX_SAC,
    0.5
);

setupInteraction(
    volumeGauge,
    () => currentVolume,
    (val) => currentVolume = val,
    MIN_VOLUME,
    MAX_VOLUME,
    1
);


// Calculation Logic
function getMN90Profile(depth, time) {
    // MN90 depths are keys in the object (strings "12", "15" etc)
    // Find the smallest table depth >= currentDepth
    // Ensure we have sorted keys
    const tableDepths = Object.keys(MN90).map(Number).sort((a, b) => a - b);

    let targetDepth = tableDepths.find(d => d >= depth);

    if (!targetDepth && depth > 0) {
        // Exceeds max table depth or not found
        if (depth <= tableDepths[tableDepths.length - 1]) {
            // Should have been found.
        } else {
            return null; // Too deep
        }
    }

    if (depth <= 0) return { stops: {}, note: "Surface" };
    if (!targetDepth) return null;

    const profiles = MN90[targetDepth];

    // Find profile with time >= currentTime
    let profile = profiles.find(p => p.time >= time);

    if (!profile) {
        // Exceeds max time for this depth
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

    // 1. Bottom Gas
    const bottomPressure = 1 + depth / 10;
    const bottomGas = time * bottomPressure * currentSAC;

    // 2. Ascent Gas
    let ascentGas = 0;

    // Ascent to first stop (or surface)
    // Speed 15m/min (MN90: 15-17m/min)
    const ascentSpeed = 15;
    const stops = profile ? profile.stops : {};

    // Get depths of stops
    const stopDepths = Object.keys(stops).map(Number).sort((a, b) => b - a); // Deepest first
    const firstTargetDepth = stopDepths.length > 0 ? stopDepths[0] : 0;

    // Ascent from bottom to first target
    if (depth > firstTargetDepth) {
        const travelTime = (depth - firstTargetDepth) / ascentSpeed;
        const avgPressure = 1 + (depth + firstTargetDepth) / 20;
        ascentGas += travelTime * avgPressure * currentSAC;
    }

    // Stops and travel between stops
    let currentStopDepth = firstTargetDepth;

    stopDepths.forEach((d, i) => {
        // Gas at stop
        const stopDuration = stops[d];
        const stopPressure = 1 + d / 10;
        ascentGas += stopDuration * stopPressure * currentSAC;

        // Travel to next stop (or surface)
        const nextTarget = (i + 1 < stopDepths.length) ? stopDepths[i + 1] : 0;
        const segmentSpeed = 6; // 6m/min between stops

        const travelTime = (d - nextTarget) / segmentSpeed;
        const avgPressure = 1 + (d + nextTarget) / 20;
        ascentGas += travelTime * avgPressure * currentSAC;

        currentStopDepth = nextTarget;
    });

    return Math.ceil(bottomGas + ascentGas);
}

// Update UI
function updateUI() {
    // Update Values
    timeDisplay.textContent = formatTime(currentTime);
    depthDisplay.textContent = currentDepth;
    pressureDisplay.textContent = currentPressure;
    sacDisplay.textContent = currentSAC;
    volumeDisplay.textContent = currentVolume;

    // Update Gauges Progress
    const length = timeProgress.getTotalLength();

    timeProgress.style.strokeDashoffset = length * (1 - Math.min(currentTime / 60, 1));
    depthProgress.style.strokeDashoffset = length * (1 - Math.min(currentDepth / 60, 1));
    pressureProgress.style.strokeDashoffset = length * (1 - Math.min(currentPressure / MAX_PRESSURE, 1));
    sacProgress.style.strokeDashoffset = length * (1 - Math.min(currentSAC / MAX_SAC, 1));
    volumeProgress.style.strokeDashoffset = length * (1 - Math.min(currentVolume / MAX_VOLUME, 1));

    // Calculate and Display Results
    const result = getMN90Profile(currentDepth, currentTime);

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

    // Render stops
    const depths = [15, 12, 9, 6, 3];
    let hasStops = false;
    let totalStopTime = 0;
    let firstStopDepth = 0;

    // Check for any stops first to set globals
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

        // Determine content
        let visualContent = '';
        if (stops[d]) {
            stopEl.classList.add('active');
            visualContent = `<div class="stop-time">${stops[d]}</div>`;
        } else {
            visualContent = `<div class="stop-dot"></div>`;
        }

        // Calculate visual height for depth (scale factor)
        // 15m is deepest. 3m is shallowest.
        // We want the line length to represent depth from the "surface" (top labels).
        // Scale: 5px per meter + a base minimum (e.g., 5px) to ensure 3m has a line.
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

    // Calculate DTR
    let dtr = 0;
    if (!hasStops) {
        stopsDisplay.innerHTML = '<div class="placeholder-text">Pas de palier</div>';
        const ascentTime = currentDepth / 15;
        dtr = Math.ceil(ascentTime);
    } else {
        const ascentToFirst = (currentDepth - firstStopDepth) / 15;
        const ascentFromFirst = firstStopDepth / 6;
        const totalAscentAndStops = ascentToFirst + totalStopTime + ascentFromFirst;
        dtr = Math.round(totalAscentAndStops);
    }

    // Calculate Gas
    const gasUsed = calculateGasConsumption(currentDepth, currentTime, result.profile);
    const pressureUsed = gasUsed / currentVolume;
    const remainingPressure = Math.round(currentPressure - pressureUsed);

    // Update Details Footer
    const dtrFormatted = formatTime(dtr);
    const gpsText = group ? `gps ${group}` : 'gps -';
    const reserveText = `réserve ${remainingPressure} bar`;

    diveDetails.textContent = `${gpsText} • dtr ${dtrFormatted} • ${reserveText}`;

    if (remainingPressure < 50) {
        diveDetails.style.color = '#e53935';
    } else {
        diveDetails.style.color = '#888';
    }
}

// Initial Call
// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    initGauges();
});
