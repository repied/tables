// State
let currentDepth = 20; // meters
let currentTime = 15; // minutes

// Constants
const MAX_DEPTH = 65;
const MIN_DEPTH = 0;
const MAX_TIME = 240; // 4 hours max for this simple planner
const MIN_TIME = 0;

// MN90 Data is available via MN90 global variable

// UI Elements
const timeGauge = document.getElementById('time-gauge-container');
const depthGauge = document.getElementById('depth-gauge-container');
const timeDisplay = document.getElementById('time-display');
const depthDisplay = document.getElementById('depth-display');
const timeProgress = document.getElementById('time-progress');
const depthProgress = document.getElementById('depth-progress');
const stopsDisplay = document.getElementById('stops-display');
const diveDetails = document.getElementById('dive-details');

// Initialize Gauges
function initGauges() {
    // Set up initial dasharray for progress rings
    // We need to know the length of the path
    const length = timeProgress.getTotalLength();
    timeProgress.style.strokeDasharray = length;
    timeProgress.style.strokeDashoffset = length;

    depthProgress.style.strokeDasharray = length;
    depthProgress.style.strokeDashoffset = length;

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

// Update UI
function updateUI() {
    // Update Values
    timeDisplay.textContent = formatTime(currentTime);
    depthDisplay.textContent = currentDepth;

    // Update Gauges Progress
    // Map value to 0-1 range
    const timeRatio = Math.min(currentTime / 60, 1); // Cap visual at 1 hour for full circle? Or max time?
    // Let's say max gauge is 60 mins for better resolution, or make it dynamic.
    // The screenshot shows "0:06", so maybe it's just a linear scale.
    // Let's use 60 mins as full scale for the gauge visual, but allow value to go higher.
    const timeVisualMax = 60;
    const timePercent = Math.min(currentTime / timeVisualMax, 1);

    const depthVisualMax = 60;
    const depthPercent = Math.min(currentDepth / depthVisualMax, 1);

    const length = timeProgress.getTotalLength();

    // Path definition: M 30 100 A 50 50 0 1 1 90 100
    // This is a partial circle (approx 250 degrees?)
    // Actually let's assume the path length corresponds to the full range.

    timeProgress.style.strokeDashoffset = length * (1 - timePercent);
    depthProgress.style.strokeDashoffset = length * (1 - depthPercent);

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

    depths.forEach(d => {
        if (stops[d]) {
            if (!hasStops) firstStopDepth = d; // Capture deepest stop
            hasStops = true;
            totalStopTime += stops[d];

            const stopEl = document.createElement('div');
            stopEl.className = 'stop-item';
            stopEl.innerHTML = `
                <div class="stop-time">${stops[d]}</div>
                <div class="stop-dot"></div>
                <div class="stop-depth">${d}m</div>
            `;
            stopsDisplay.appendChild(stopEl);
        }
    });

    if (!hasStops) {
        stopsDisplay.innerHTML = '<div class="placeholder-text">Pas de palier</div>';
        // DTR calculation for no stops
        const ascentTime = currentDepth / 15; // 15m/min
        const dtr = Math.ceil(ascentTime);

        // Group
        let details = `DTR: ${dtr} min`;
        if (group) details += ` | Groupe: ${group}`;
        diveDetails.textContent = details;
    } else {
        // DTR Calculation with stops
        // Ascent to first stop
        const ascentToFirst = (currentDepth - firstStopDepth) / 15;

        // Ascent between stops and to surface (6m/min)
        // From first stop to surface, it's (firstStopDepth / 6) minutes total travel time?
        // Yes, 3m takes 0.5min. 6m takes 1 min travel + stop.
        // So travel time from first stop depth to surface = firstStopDepth / 6.

        const ascentFromFirst = firstStopDepth / 6;

        const totalAscentAndStops = ascentToFirst + totalStopTime + ascentFromFirst;
        const dtr = Math.round(totalAscentAndStops);

        let details = `DTR: ${dtr} min`;
        if (group) details += ` | Groupe: ${group}`;
        diveDetails.textContent = details;
    }
}

// Initial Call
// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    initGauges();
});
