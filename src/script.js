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
let prevGroup = null;
let surfaceInterval = 60 * 3; // minutes

// Constants
const MAX_DEPTH = 65;
const MIN_DEPTH = 0;
const MAX_TIME = 60 * 3;
const MIN_TIME = 0;

const MAX_TANK_PRESSURE = 300;
const MIN_TANK_PRESSURE = 50;
const MAX_SAC = 40;
const MIN_SAC = 10;
const MAX_TANK_VOLUME = 30;
const MIN_TANK_VOLUME = 5;
const MAX_O2_pct = 40;
const MIN_O2_pct = 21;
const MAX_GF_pct = 100;
const MIN_GF_pct = 10;
const MAX_INTERVAL = 60 * 12; // after 12 hours MN90 assumes a fresh dive
const MIN_INTERVAL = 15; // less 15min MN90 says it's another calculation
const RESERVE_PRESSURE_THRESHOLD = 50; // bar
const PPO2_THRESHOLD_ORANGE = 1.5; // Maximum safe ppO2

// Language State
let currentLang = localStorage.getItem('selectedLang') || 'fr';

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
const gpsDisplay1 = document.getElementById('gps-display-1');

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
    const success = await window.dataManager.loadAllData();
    if (!success) {
        alert("Erreur de chargement des données. Vérifiez la connexion.");
        return;
    }

    initGauges();
    setupInteractions();
    setupModal();

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        // Set initial state from localStorage
        langToggle.checked = (currentLang === 'en');

        langToggle.addEventListener('change', () => {
            currentLang = langToggle.checked ? 'en' : 'fr';
            localStorage.setItem('selectedLang', currentLang);
            translateUI();
            updateUI();
        });
    }
    translateUI();
}

function translateUI() {
    const elements = document.querySelectorAll('[data-i18n]');
    const trans = window.translations;
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (trans && trans[currentLang][key]) {
            el.innerHTML = trans[currentLang][key];
        }
    });
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
    setupGaugeInteraction(timeGauge, () => dive1Time, (val) => dive1Time = val, MIN_TIME, MAX_TIME, 1);
    setupGaugeInteraction(depthGauge, () => dive1Depth, (val) => dive1Depth = val, MIN_DEPTH, MAX_DEPTH, 0.2);
    setupGaugeInteraction(pressureGauge, () => initTankPressure, (val) => initTankPressure = val, MIN_TANK_PRESSURE, MAX_TANK_PRESSURE, 1);
    setupGaugeInteraction(sacGauge, () => sac, (val) => sac = val, MIN_SAC, MAX_SAC, 0.5);
    setupGaugeInteraction(volumeGauge, () => tankVolume, (val) => tankVolume = val, MIN_TANK_VOLUME, MAX_TANK_VOLUME, 1);
    setupGaugeInteraction(o2Gauge, () => gazO2pct, (val) => gazO2pct = val, MIN_O2_pct, MAX_O2_pct, 1);

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
        setupGaugeInteraction(intervalGauge, () => surfaceInterval, (val) => surfaceInterval = val, MIN_INTERVAL, MAX_INTERVAL, 10);
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

// Formatting
function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

// Helper to render stops
function renderStops(result, containerElement) {
    containerElement.innerHTML = '';
    const trans = window.translations;

    if (!result) {
        containerElement.innerHTML = `<div class="placeholder-text">${trans[currentLang].maxDepthExceeded}</div>`;
        return;
    }

    if (result.error) {
        containerElement.innerHTML = `<div class="placeholder-text">${trans[currentLang].outOfTable}</div>`;
        return;
    }

    if (result.note === "Surface") {
        containerElement.innerHTML = `<div class="placeholder-text">${trans[currentLang].surface}</div>`;
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

// Update UI
function updateUI() {
    document.body.classList.toggle('gf-mode', isGFMode);

    // Common Calcs
    const length = timeProgress ? timeProgress.getTotalLength() : 0;

    // --- DIVE 1 UI ---
    updateGaugeVisuals('time', dive1Time, MAX_TIME, true);
    updateGaugeVisuals('depth', dive1Depth, MAX_DEPTH);
    updateGaugeVisuals('pressure', initTankPressure, MAX_TANK_PRESSURE);
    updateGaugeVisuals('sac', sac, MAX_SAC);
    updateGaugeVisuals('volume', tankVolume, MAX_TANK_VOLUME);
    updateGaugeVisuals('o2', gazO2pct, MAX_O2_pct);

    if (gfLowDisplay) {
        gfLowDisplay.textContent = currentGFLow;
        gfHighDisplay.textContent = currentGFHigh;
        if (gfLowProgress) gfLowProgress.style.strokeDashoffset = length * (1 - Math.min(currentGFLow / 100, 1));
        if (gfHighProgress) gfHighProgress.style.strokeDashoffset = length * (1 - Math.min(currentGFHigh / 100, 1));
    }

    // --- DIVE 1 CALCULATION ---
    const ppo2_1 = Planning.calculatePPO2(dive1Depth, gazO2pct);
    const ppo2Ticks = calculatePPO2Tick(dive1Depth, gazO2pct);

    updateGaugeTicks('depth-gauge-container', ppo2Ticks, MIN_DEPTH, MAX_DEPTH);
    if (depthGauge2) updateGaugeTicks('depth-gauge-container-2', ppo2Ticks, MIN_DEPTH, MAX_DEPTH);

    const timeTicks1 = calculateStopTicks(dive1Depth, 0);
    updateGaugeTicks('time-gauge-container', timeTicks1, MIN_TIME, MAX_TIME);

    let result1, finalTensions1;
    if (isGFMode) {
        const res = Planning.calculateBuehlmannPlan({
            bottomTime: dive1Time, maxDepth: dive1Depth,
            gfLow: currentGFLow, gfHigh: currentGFHigh,
            fN2: (100 - gazO2pct) / 100
        });
        result1 = { profile: { stops: res.stops, group: 'GF_GPS' }, note: '' };
        finalTensions1 = res.finalTensions;
    } else {
        const ead1 = Planning.calculateEAD(dive1Depth, gazO2pct);
        result1 = Planning.getMN90Profile(ead1, dive1Time);
    }

    renderStops(result1, stopsDisplay);

    if (gpsDisplay1) {
        if (result1 && result1.profile && result1.profile.group && result1.profile.group !== 'GF_GPS') {
            gpsDisplay1.innerHTML = `<div class="gps-badge">${window.translations[currentLang].gps} ${result1.profile.group}</div>`;
            gpsDisplay1.style.visibility = 'visible';
        } else {
            gpsDisplay1.innerHTML = '';
            gpsDisplay1.style.visibility = 'hidden';
        }
    }

    renderDiveDetails(diveDetails, result1, dive1Depth, dive1Time, initTankPressure, ppo2_1, false);


    // --- DIVE 2 UI ---
    if (successiveHeaderText) successiveHeaderText.textContent = window.translations[currentLang].secondDive;

    // Determine previous group / state
    let prevGroup = (result1 && result1.profile && result1.profile.group) ? result1.profile.group : null;

    let result2, currentMajoration = 0;

    if (isGFMode) {
        // Tension evolution
        const sursaturationBeforePct = finalTensions1 ? 100 * (Math.max(...finalTensions1) - Planning.AIR_FN2) / Planning.AIR_FN2 : 0;
        let currentTensions = finalTensions1;
        if (currentTensions) {
            const surfacePN2 = Planning.depthToPN2(0, Planning.SURFACE_PRESSURE, Planning.AIR_FN2);
            currentTensions = Planning.updateAllTensions(currentTensions, surfacePN2, surfaceInterval);
        }
        const sursaturationAfterPct = currentTensions ? 100 * (Math.max(...currentTensions) - Planning.AIR_FN2) / Planning.AIR_FN2 : 0;

        if (majorationDisplay) {
            const tensionEvolutionLabel = window.translations[currentLang].tensionEvolution;
            majorationDisplay.innerHTML = tensionEvolutionLabel + `${sursaturationBeforePct.toFixed(0)}%` + ` → ${sursaturationAfterPct.toFixed(0)}%`;
        }

        const res_bu_2 = Planning.calculateBuehlmannPlan({
            bottomTime: dive2Time, maxDepth: dive2Depth,
            gfLow: currentGFLow, gfHigh: currentGFHigh,
            fN2: (100 - gazO2pct) / 100,
            initialTensions: currentTensions
        });
        result2 = { profile: { stops: res_bu_2.stops, group: '-' }, note: '' };

    } else {
        const ead2 = Planning.calculateEAD(dive2Depth, gazO2pct);
        const succResult = Planning.calculateSuccessive(prevGroup, surfaceInterval, ead2);

        currentMajoration = (succResult && !succResult.error) ? succResult.majoration : 0;

        if (majorationDisplay) {
            let majText = "Err";
            if (succResult && !succResult.error) {
                majText = `+${currentMajoration} min (${window.translations[currentLang].gps} ${prevGroup})`;
            } else if (succResult && succResult.error) {
                majText = window.translations[currentLang].secondDiveNotAuthorized;
            }
            majorationDisplay.textContent = `${window.translations[currentLang].majoration}: ${majText} `;
        }

        const effectiveTime2 = dive2Time + currentMajoration;
        result2 = Planning.getMN90Profile(ead2, effectiveTime2);
    }

    if (intervalDisplay) intervalDisplay.textContent = formatTime(surfaceInterval);
    if (intervalProgress) intervalProgress.style.strokeDashoffset = length * (1 - Math.min(surfaceInterval / MAX_INTERVAL, 1));

    updateGaugeVisuals('time', dive2Time, 60, true, '-2');
    updateGaugeVisuals('depth', dive2Depth, MAX_DEPTH, false, '-2');

    const ppo2_2 = Planning.calculatePPO2(dive2Depth, gazO2pct);
    const timeTicks2 = calculateStopTicks(dive2Depth, currentMajoration);
    if (timeGauge2) updateGaugeTicks('time-gauge-container-2', timeTicks2, MIN_TIME, MAX_TIME);

    renderStops(result2, stopsDisplay2);
    renderDiveDetails(diveDetails2, result2, dive2Depth, dive2Time, initTankPressure, ppo2_2, true);
}

function updateGaugeVisuals(type, value, max, isTime = false, suffix = '') {
    const progressId = `${type}-progress${suffix}`;
    const displayId = `${type}-display${suffix}`;

    const progressEl = document.getElementById(progressId);
    if (progressEl) {
        const length = progressEl.getTotalLength();
        progressEl.style.strokeDashoffset = length * (1 - Math.min(value / max, 1));
    }

    const displayEl = document.getElementById(displayId);
    if (displayEl) {
        displayEl.textContent = isTime ? formatTime(value) : value;
    }
}

function renderDiveDetails(container, result, diveDepth, diveTime, tankP, ppo2, isSecondDive) {
    if (!container) return;
    container.innerHTML = '';
    const trans = window.translations;

    if (!result) {
        container.innerHTML = `<div class="placeholder-text">${trans[currentLang].maxDepthExceeded}</div>`;
        return;
    }
    if (result.error) {
        container.innerHTML = `<div class="placeholder-text">${trans[currentLang].outOfTable}</div>`;
        return;
    }
    if (result.note === "Surface") {
        container.innerHTML = `<div class="placeholder-text">${trans[currentLang].surface}</div>`;
        return;
    }

    const gps = result.profile.group;
    const dtr = Planning.calculateDTR(diveDepth, result.profile.stops);
    const dtrFormatted = formatTime(dtr);

    const gasUsed = Planning.calculateGasConsumption(diveDepth, diveTime, result.profile, sac);
    const pressureUsed = gasUsed / tankVolume;
    const remainingPressure = Math.floor(tankP - pressureUsed);

    const dtrHtml = `<div class="result-box important"><span class="result-label">${trans[currentLang].dtr}</span><span class="result-value">${dtrFormatted}</span></div>`;
    const reserveHtml = `<div class="result-box important reserve-box"><span class="result-label">${trans[currentLang].reserve}</span><span class="result-value">${remainingPressure} bar</span></div>`;

    let nitroxHtml = `<div class="result-box important"><span class="result-label">ppO2 max</span><span class="result-value">${ppo2.toFixed(2)}</span></div>`;


    container.innerHTML = `<div class="results-row">${dtrHtml}${reserveHtml}${nitroxHtml}</div>`;

    if (remainingPressure < RESERVE_PRESSURE_THRESHOLD) {
        const rb = container.querySelector('.reserve-box');
        if (rb) rb.style.backgroundColor = '#e53935';
    }
    if (ppo2 > PPO2_THRESHOLD_ORANGE) {
        container.querySelectorAll('.result-box.important').forEach(el => el.style.borderColor = '#ff9800');
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);

function setupModal() {
    const modal = document.getElementById("help-modal");
    const btn = document.getElementById("help-link");

    if (btn && modal) {
        btn.onclick = function (e) {
            e.preventDefault();
            modal.style.display = "block";
        }

        modal.onclick = function () {
            modal.style.display = "none";
        }

        // Show modal on first visit
        if (!localStorage.getItem('hasVisited')) {
            modal.style.display = "block";
            localStorage.setItem('hasVisited', 'true');
        }
    }
}

// ----------------------------------------------------------------------------
// Gauge Ticks Features
// ----------------------------------------------------------------------------

function updateGaugeTicks(gaugeContainerId, ticks, min, max) {
    const container = document.getElementById(gaugeContainerId);
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    let ticksGroup = svg.querySelector('.gauge-ticks');
    if (!ticksGroup) {
        ticksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        ticksGroup.classList.add('gauge-ticks');
        // Insert before the last element (likely the text content) but after the ring
        // Actually, just appending it puts it on top of paths, which is good.
        svg.appendChild(ticksGroup);
    }

    ticksGroup.innerHTML = ''; // Clear existing

    // Geometry Constants
    const CENTER_X = 60;
    const CENTER_Y = 60;
    const RADIUS = 50;
    const START_ANGLE = 2.2143; // ~126.87 deg
    const SPAN_ANGLE = 4.996; // ~286 deg

    ticks.forEach(tick => {
        if (tick.value < min || tick.value > max) return;

        const fraction = (tick.value - min) / (max - min);
        const angle = START_ANGLE + fraction * SPAN_ANGLE;

        // Tick Geometry
        // Outward tick: from R to R+length
        const r1 = RADIUS - 2; // Slightly inside
        const r2 = RADIUS + 4; // Slightly outside

        const x1 = CENTER_X + r1 * Math.cos(angle);
        const y1 = CENTER_Y + r1 * Math.sin(angle);
        const x2 = CENTER_X + r2 * Math.cos(angle);
        const y2 = CENTER_Y + r2 * Math.sin(angle);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        // Label Geometry
        const rText = RADIUS + 12;
        const xText = CENTER_X + rText * Math.cos(angle);
        const yText = CENTER_Y + rText * Math.sin(angle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", xText);
        text.setAttribute("y", yText + 2); // vertical align adjustment
        text.textContent = tick.label;

        // Group for specific tick style
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (tick.className) g.classList.add(tick.className);

        g.appendChild(line);
        g.appendChild(text);
        ticksGroup.appendChild(g);
    });
}

function calculatePPO2Tick(depth, o2Pct) {
    // PPO2 = (1 + D/10) * (O2/100)
    // D_max = ( (PPO2_max / (O2/100)) - 1 ) * 10
    const limit = PPO2_THRESHOLD_ORANGE; // 1.6
    const fractionO2 = o2Pct / 100;
    const maxDepth = ((limit / fractionO2) - 1) * 10;

    return [{
        value: maxDepth,
        label: `${Math.floor(maxDepth)}'`,
        className: 'gauge-tick-warning'
    }];
}

function calculateStopTicks(depth, majoration = 0) {
    if (isGFMode) return []; // Only MN90 for now

    // Find stops in table
    // Iterate time entries to find when stops appear or change
    const table = window.dataManager.getMN90();
    if (!table) return [];

    // Find closest depth in table >= actual depth
    const depths = Object.keys(table).map(d => parseInt(d)).sort((a, b) => a - b);
    const tableDepth = depths.find(d => d >= depth);
    if (!tableDepth) return []; // Too deep

    const rows = table[tableDepth];
    if (!rows) return [];

    const ticks = [];
    let lastStop = 0; // 0 means no stop

    // We assume rows are sorted by time? Actually rows is array of objects {time, stops, group}
    // They are usually sorted in CSV.

    for (const row of rows) {
        // row.stops is { "3": 1, "6": 2 ... }
        // Find deepest stop
        const stopDepths = Object.keys(row.stops).map(k => parseInt(k)).sort((a, b) => b - a);
        const currentDeepest = stopDepths.length > 0 ? stopDepths[0] : 0;

        // If we transitioned from no stop to stop, or deeper stop
        // User asked for "first 3m stop".
        // Let's add tick for the *first appearance* of a specific stop depth.
        // Or simply every time the required stop depth changes.

        if (currentDeepest > lastStop) {
            // Calculate Gauge Time
            // Gauge Time = Table Time - Majoration
            const gaugeTime = row.time - majoration;

            if (gaugeTime > 0) {
                ticks.push({
                    value: gaugeTime,
                    label: `${currentDeepest}m`,
                    className: 'gauge-tick-stop'
                });
            }
            lastStop = currentDeepest;
        }
    }

    // Add Max Time Tick (Out of Table)
    // The last row in `rows` is the maximum time for this depth.
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const maxTime = lastRow.time - majoration;
        if (maxTime > 0) {
            ticks.push({
                value: maxTime,
                label: '', // No label requested
                className: 'gauge-tick-max'
            });
        }
    }

    return ticks;
}
