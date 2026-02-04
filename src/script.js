
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
const MAX_TIME = 240;
const MIN_TIME = 0;

const MAX_TANK_PRESSURE = 300;
const MIN_TANK_PRESSURE = 50;
const MAX_SAC = 40;
const MIN_SAC = 10;
const MAX_TANK_VOLUME = 30;
const MIN_TANK_VOLUME = 5;
const MAX_O2_pct = 50;
const MIN_O2_pct = 21;
const MAX_GF_pct = 100;
const MIN_GF_pct = 10;
const MAX_INTERVAL = 60 * 12; // after 12 hours MN90 assumes a fresh dive
const MIN_INTERVAL = 15; // less 15min MN90 says it's another calculation
const RESERVE_PRESSURE_THRESHOLD = 50; // bar
const PPO2_THRESHOLD_ORANGE = 1.4; // Maximum safe ppO2
const PPO2_THRESHOLD_RED = 1.6; // Maximum safe ppO2

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
    const ead1 = Planning.calculateEAD(dive1Depth, gazO2pct);
    const ppo2_1 = Planning.calculatePPO2(dive1Depth, gazO2pct);
    const isNitrox = gazO2pct > 21;

    let result1;
    let dtr1;
    let finalTensions1 = null;

    if (isGFMode) {
        // Buehlmann Algo
        const fN2 = (100 - gazO2pct) / 100;
        const res_bu_1 = Planning.calculateBuehlmannPlan({
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
        dtr1 = Planning.calculateDTR(dive1Depth, result1.profile.stops);
        // console.log("Dive 1: Buehlmann DTR:", dtr1_buhlmann, "Calculated DTR:", dtr1);
        finalTensions1 = res_bu_1.finalTensions;
    } else {
        // Calculate Profile (Use EAD for Dive 1)
        result1 = Planning.getMN90Profile(ead1, dive1Time);
        if (result1 && !result1.error && result1.note !== "Surface") {
            dtr1 = Planning.calculateDTR(dive1Depth, result1.profile.stops);
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
        const gasUsed = Planning.calculateGasConsumption(dive1Depth, dive1Time, result1.profile, sac);
        const pressureUsed = gasUsed / tankVolume;
        const remainingPressure = Math.floor(initTankPressure - pressureUsed);

        const gpsHtml = (gps1 === 'GF_GPS' || !gps1) ? '' : `<div class="gps-badge">${window.translations[currentLang].gps} ${gps1}</div>`;
        const dtrHtml = `<div class="result-box important"><span class="result-label">${translations[currentLang].dtr}</span><span class="result-value">${dtrFormatted}</span></div>`;
        const reserveHtml = `<div class="result-box important"><span class="result-label">${translations[currentLang].reserve}</span><span class="result-value">${remainingPressure} bar</span></div>`;
        let nitroxHtml = '';
        if (isNitrox) {
            nitroxHtml = `<div class="result-box"><span class="result-label">ppO2</span><span class="result-value">${ppo2_1.toFixed(2)}</span></div>`;
        }

        diveDetails.innerHTML = `${gpsHtml}${dtrHtml}${reserveHtml}${nitroxHtml}`;

        if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_1 > PPO2_THRESHOLD_RED) {
            diveDetails.querySelectorAll('.result-box.important').forEach(el => el.style.borderColor = '#e53935');
        } else if (ppo2_1 > PPO2_THRESHOLD_ORANGE) {
            diveDetails.querySelectorAll('.result-box.important').forEach(el => el.style.borderColor = '#ff9800');
        }
    } else if (result1 && result1.error) {
        diveDetails.textContent = translations[currentLang].outOfTable;
    }

    // Update Successive Header Text with GPS
    if (successiveHeaderText) {
        successiveHeaderText.textContent = window.translations[currentLang].secondDive;
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
    const ead2 = Planning.calculateEAD(dive2Depth, gazO2pct);
    const ppo2_2 = Planning.calculatePPO2(dive2Depth, gazO2pct);

    // Calculate Majoration using EAD2
    const succResult = Planning.calculateSuccessive(prevGroup, surfaceInterval, ead2);

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
            const avgTensionLabel = window.translations[currentLang].avgTension;
            const avgTension = finalTensions1 ? (finalTensions1.reduce((a, b) => a + b, 0) / finalTensions1.length).toFixed(2) : '-';
            const tensionsStr = finalTensions1 ? finalTensions1.map(t => t.toFixed(2)).join(', ') : '-';
            majorationDisplay.innerHTML = `${avgTensionLabel}<br>${avgTension} bar -> `;
        }
        // Buehlmann Algo for Dive 2 with residual nitrogen
        const fN2 = (100 - gazO2pct) / 100;

        // Surface interval evolution
        let currentTensions = finalTensions1;
        if (currentTensions) {
            const surfacePN2 = Planning.depthToPN2(0, Planning.SURFACE_PRESSURE, Planning.AIR_FN2); // Air at surface
            currentTensions = Planning.updateAllTensions(currentTensions, surfacePN2, surfaceInterval);
        }

        if (majorationDisplay) {
            const displayTensions = currentTensions || finalTensions1;
            const avgTension = displayTensions ? (displayTensions.reduce((a, b) => a + b, 0) / displayTensions.length).toFixed(2) : '-';
            const tensionsStr = displayTensions ? displayTensions.map(t => t.toFixed(2)).join(', ') : '-';
            majorationDisplay.innerHTML += `${avgTension} bar`;
        }

        // Dive 2 Simulation
        const res2 = Planning.calculateBuehlmannPlan({
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
        dtr2 = Planning.calculateDTR(dive2Depth, result2.profile.stops);
        // console.log("Dive 2: Buehlmann DTR:", dtr2_buhlmann, "Calculated DTR:", dtr2);
    } else {
        let majText = "Err";
        let currentMajoration = 0;

        if (succResult && !succResult.error) {
            currentMajoration = succResult.majoration;
            majText = `+${currentMajoration} min (${window.translations[currentLang].gps} ${gps1})`;
        } else if (succResult && succResult.error) {
            majText = "Err"; // e.g. interval too short
        }

        if (majorationDisplay) {
            majorationDisplay.textContent = `${window.translations[currentLang].majoration}: ${majText} `;
        }

        const effectiveTime2 = dive2Time + currentMajoration;
        result2 = Planning.getMN90Profile(ead2, effectiveTime2);
        if (result2 && !result2.error && result2.note !== "Surface") {
            dtr2 = Planning.calculateDTR(dive2Depth, result2.profile.stops);
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
            const gasUsed = Planning.calculateGasConsumption(dive2Depth, dive2Time, result2.profile, sac);
            const pressureUsed = gasUsed / tankVolume;
            const remainingPressure = Math.round(initTankPressure - pressureUsed);

            const dtrHtml = `<div class="result-box important"><span class="result-label">${window.translations[currentLang].dtr}</span><span class="result-value">${dtrFormatted}</span></div>`;
            const reserveHtml = `<div class="result-box important"><span class="result-label">${window.translations[currentLang].reserve}</span><span class="result-value">${remainingPressure} bar</span></div>`;
            let nitroxHtml = '';
            if (isNitrox) {
                nitroxHtml = `<div class="result-box"><span class="result-label">ppO2</span><span class="result-value">${ppo2_2.toFixed(2)}</span></div>`;
            }

            diveDetails2.innerHTML = `${dtrHtml}${reserveHtml}${nitroxHtml}`;

            if (remainingPressure < RESERVE_PRESSURE_THRESHOLD || ppo2_2 > 1.6) {
                diveDetails2.querySelectorAll('.result-box.important').forEach(el => el.style.borderColor = '#e53935');
            } else if (ppo2_2 > PPO2_THRESHOLD_ORANGE) {
                diveDetails2.querySelectorAll('.result-box.important').forEach(el => el.style.borderColor = '#ff9800');
            }
        } else if (result2 && result2.error) {
            diveDetails2.textContent = window.translations[currentLang].outOfTable;
        }
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
