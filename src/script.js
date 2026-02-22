// Dives Parameters set in UI
let dive1Depth = 40; // meters, bottom depth of the "square" dive
let dive1Time = 15; // minutes, diveTime = time for descent + time at bottom depth
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
let surfaceInterval = 60 * 3; // minutes

// App Constant values
const RESERVE_PRESSURE_THRESHOLD = 50; // bar
const PPO2_THRESHOLD_ORANGE = 1.5; // Maximum safe ppO2 (update translations if you change it)

// Gauge definitions
const MAX_DEPTH = 65;
const MIN_DEPTH = 1; // do not put 0, makes no sense
const MAX_TIME = 60 * 2;
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

// PWA Install logic
let deferredPrompt;

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
    setupInstallLogic();

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        // Set initial state from localStorage
        langToggle.checked = (currentLang === 'en');

        langToggle.addEventListener('change', () => {
            currentLang = langToggle.checked ? 'en' : 'fr';
            localStorage.setItem('selectedLang', currentLang);
            translateUI();
            renderUI();
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

    renderUI();
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
            renderUI();
        });
        gfToggle.addEventListener('change', () => {
            isGFMode = true;
            renderUI();
        });
    }

    if (timeGauge2 && depthGauge2) {
        setupGaugeInteraction(timeGauge2, () => dive2Time, (val) => dive2Time = val, MIN_TIME, MAX_TIME, 1);
        setupGaugeInteraction(depthGauge2, () => dive2Depth, (val) => dive2Depth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    }

    if (intervalGauge) {
        setupGaugeInteraction(intervalGauge, () => surfaceInterval, (val) => surfaceInterval = val, MIN_INTERVAL, MAX_INTERVAL, 10);
    }
}


function setupGaugeInteraction(gaugeElement, getValue, setValue, min, max, sensitivity = 0.5) {
    if (!gaugeElement) return;

    // Make the gauge keyboard-focusable and expose ARIA slider attributes
    try {
        gaugeElement.tabIndex = 0;
        gaugeElement.setAttribute('role', 'slider');
        gaugeElement.setAttribute('aria-valuemin', String(min));
        gaugeElement.setAttribute('aria-valuemax', String(max));
        gaugeElement.setAttribute('aria-valuenow', String(getValue()));
        const label = gaugeElement.getAttribute('aria-label') || gaugeElement.id.replace('-gauge-container', '').replace('-2', '').replace(/-/g, ' ');
        gaugeElement.setAttribute('aria-label', label);
    } catch (e) {
        // ignore in environments where DOM mutation might fail
    }

    let startY = 0;
    let startValue = 0;
    let isDragging = false;
    let hasMoved = false;

    // Default value capture
    const defaultValue = getValue();

    // Interaction state
    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300; // ms
    let singleTapTimer = null;

    gaugeElement.addEventListener('pointerdown', (e) => {
        const currentTime = new Date().getTime();
        const timeSinceLastTap = currentTime - lastTapTime;

        // Double Tap Detection
        if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
            // It is a double tap
            if (singleTapTimer) clearTimeout(singleTapTimer);

            // Reset to default
            setValue(defaultValue);
            renderUI();

            // Reset state
            lastTapTime = 0;
            isDragging = false;
            e.preventDefault();
            return;
        }

        // Potential start of single tap or drag
        isDragging = true;
        hasMoved = false;
        startY = e.clientY;
        startValue = getValue();
        lastTapTime = currentTime;

        gaugeElement.setPointerCapture(e.pointerId);
        gaugeElement.style.cursor = 'ns-resize';
    });

    gaugeElement.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        // Threshold for drag detection
        if (Math.abs(e.clientY - startY) > 5) {
            hasMoved = true;
            if (singleTapTimer) clearTimeout(singleTapTimer);
        }

        if (hasMoved) {
            const deltaY = startY - e.clientY;
            const change = Math.round(deltaY * sensitivity);
            let newValue = startValue + change;
            if (newValue < min) newValue = min;
            if (newValue > max) newValue = max;
            if (newValue !== getValue()) {
                setValue(newValue);
                renderUI();
            }
        }
    });

    gaugeElement.addEventListener('pointerup', (e) => {
        if (!isDragging) return; // double tap case

        const pressDuration = new Date().getTime() - lastTapTime;
        isDragging = false;
        gaugeElement.style.cursor = 'default';
        gaugeElement.releasePointerCapture(e.pointerId);

        if (!hasMoved && pressDuration < 300) {
            // It was a short tap
            // Schedule single tap action
            singleTapTimer = setTimeout(() => {
                showGaugeValueDropdown(gaugeElement, getValue(), setValue, min, max);
            }, DOUBLE_TAP_DELAY);
        }
    });

    gaugeElement.addEventListener('pointercancel', (e) => {
        isDragging = false;
        hasMoved = false;
        gaugeElement.style.cursor = 'default';
        if (singleTapTimer) clearTimeout(singleTapTimer);
    });

    // Keyboard interaction for accessibility
    gaugeElement.addEventListener('keydown', (e) => {
        const cur = getValue();
        const step = (sensitivity >= 1) ? Math.round(sensitivity) : (sensitivity > 0 ? 0.5 : 1);
        switch (e.key) {
            case 'ArrowUp':
            case 'ArrowRight':
                setValue(Math.min(max, cur + step));
                renderUI();
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 'ArrowLeft':
                setValue(Math.max(min, cur - step));
                renderUI();
                e.preventDefault();
                break;
            case 'PageUp':
                setValue(Math.min(max, cur + Math.max(1, step * 5)));
                renderUI();
                e.preventDefault();
                break;
            case 'PageDown':
                setValue(Math.max(min, cur - Math.max(1, step * 5)));
                renderUI();
                e.preventDefault();
                break;
            case 'Home':
                setValue(min);
                renderUI();
                e.preventDefault();
                break;
            case 'End':
                setValue(max);
                renderUI();
                e.preventDefault();
                break;
            case 'Enter':
            case ' ':
                showGaugeValueDropdown(gaugeElement, getValue(), setValue, min, max);
                e.preventDefault();
                break;
        }
    });
}

function showGaugeValueDropdown(gaugeElement, currentValue, setValue, min, max) {
    // Remove existing if any
    const existing = document.querySelector('.gauge-dropdown-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'gauge-dropdown-overlay';

    const content = document.createElement('div');
    content.className = 'gauge-dropdown-content';

    // Header
    const baseKey = gaugeElement.id.replace('-gauge-container', '').replace('-2', '');
    const trans = window.translations?.[currentLang];
    const titleKey = `${baseKey}-title`;
    const gaugeName = (trans?.[titleKey] || trans?.[baseKey] || baseKey.replace(/-/g, ' ')).toUpperCase();
    const header = document.createElement('div');
    header.className = 'gauge-dropdown-header';
    header.innerHTML = `
        <span style="flex-grow:1">${gaugeName}</span>
    `;

    content.appendChild(header);

    // List Container
    const listContainer = document.createElement('div');
    listContainer.style.overflowY = 'auto';
    listContainer.style.flexGrow = '1';

    // Step Logic
    let step = 1;
    if (max - min < 60 && (min % 1 !== 0 || max % 1 !== 0 || currentValue % 1 !== 0)) {
        step = 0.5;
    }

    for (let val = min; val <= max; val += step) {
        const item = document.createElement('div');
        item.className = 'gauge-dropdown-item';
        item.textContent = val;
        if (Math.abs(val - currentValue) < 0.1) {
            item.classList.add('selected');
        }
        item.onclick = () => {
            setValue(val);
            renderUI();
            closeDropdown();
        };
        listContainer.appendChild(item);
    }
    content.appendChild(listContainer);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Scroll to selected
    setTimeout(() => {
        const selected = content.querySelector('.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'center' });
        }
        overlay.classList.add('visible');
    }, 10);

    // Close on overlay click
    overlay.onclick = (e) => {
        closeDropdown();
    };

    // Accessibility: make overlay a dialog and support keyboard actions (Esc to close)
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', gaugeName);
    overlay.tabIndex = -1;

    // No dedicated close button on dropdowns (use Escape or backdrop click)

    // Make items keyboard-focusable and operable
    const items = content.querySelectorAll('.gauge-dropdown-item');
    items.forEach(it => {
        it.tabIndex = 0;
        it.setAttribute('role', 'option');
        it.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                it.click();
            }
        });
    });

    function onOverlayKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
        }
    }

    overlay.addEventListener('keydown', onOverlayKeyDown);

    // Focus selected item or close button
    setTimeout(() => {
        const selected = content.querySelector('.selected');
        if (selected) selected.focus();
        else overlay.focus();
    }, 50);

    function closeDropdown() {
        overlay.classList.remove('visible');
        overlay.removeEventListener('keydown', onOverlayKeyDown);
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
    }
}

function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
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

    // Update ARIA on the container so assistive tech sees the current value
    try {
        const containerEl = document.getElementById(`${type}-gauge-container${suffix}`);
        if (containerEl) {
            containerEl.setAttribute('aria-valuenow', String(value));
            containerEl.setAttribute('aria-valuetext', isTime ? formatTime(value) : String(value));
        }
    } catch (e) {
        // ignore
    }
}

function renderUI() {
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

    const timeTicks1 = calculateStopTicks(dive1Depth, gazO2pct, 0);
    updateGaugeTicks('time-gauge-container', timeTicks1, MIN_TIME, MAX_TIME);

    let result1;
    if (isGFMode) {
        result1 = Planning.calculateBuhlmannPlan({
            bottomTime: dive1Time, maxDepth: dive1Depth,
            gfLow: currentGFLow, gfHigh: currentGFHigh,
            fN2: (100 - gazO2pct) / 100
        });
    } else {
        const ead1 = Planning.calculateEquivalentAirDepth(dive1Depth, gazO2pct);
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

    renderDiveDetails(diveDetails, result1, dive1Depth, dive1Time, initTankPressure, ppo2_1);


    // --- DIVE 2 UI ---
    if (successiveHeaderText) successiveHeaderText.textContent = window.translations[currentLang].secondDive;


    let result2, currentMajoration = 0;
    if (isGFMode) {
        // Tension evolution
        const surface_air_alv_ppn2 = Planning.SURFACE_AIR_ALV_PPN2;
        let currentTensions = result1 ? result1.finalTensions : null;
        const sursaturationBeforePct = currentTensions ? 100 * (Math.max(...currentTensions) - surface_air_alv_ppn2) / surface_air_alv_ppn2 : 0;
        if (currentTensions) {
            currentTensions = Planning.updateAllTensions(currentTensions, surface_air_alv_ppn2, surfaceInterval);
        }
        const sursaturationAfterPct = currentTensions ? 100 * (Math.max(...currentTensions) - surface_air_alv_ppn2) / surface_air_alv_ppn2 : 0;

        if (majorationDisplay) {
            const tensionEvolutionLabel = window.translations[currentLang].tensionEvolution;
            majorationDisplay.innerHTML = tensionEvolutionLabel + `${sursaturationBeforePct.toFixed(0)}%` + ` → ${sursaturationAfterPct.toFixed(0)}%`;
        }

        result2 = Planning.calculateBuhlmannPlan({
            bottomTime: dive2Time, maxDepth: dive2Depth,
            gfLow: currentGFLow, gfHigh: currentGFHigh,
            fN2: (100 - gazO2pct) / 100,
            initialTensions: currentTensions
        });

    } else {
        const prevGroup = (result1 && result1.profile && result1.profile.group) ? result1.profile.group : null;
        const ead2 = Planning.calculateEquivalentAirDepth(dive2Depth, gazO2pct);
        const succResult = Planning.calculateSuccessive(prevGroup, surfaceInterval, ead2);

        currentMajoration = (succResult && !succResult.error) ? succResult.majoration : 0;
        const effectiveTime2 = dive2Time + currentMajoration;
        result2 = Planning.getMN90Profile(ead2, effectiveTime2);

        if (majorationDisplay) {
            let majText = "Error";
            if (succResult && !succResult.error) {
                majText = `+${currentMajoration} min`;
                majorationDisplay.textContent = `${window.translations[currentLang].majoration}: ${majText} `;
            } else if (succResult && succResult.error) {
                majText = window.translations[currentLang].secondDiveNotAuthorized;
                majorationDisplay.textContent = `${majText} `;
                result2.second_dive_not_authorized = true;
            }
        }
    }

    if (intervalDisplay) intervalDisplay.textContent = formatTime(surfaceInterval);
    if (intervalProgress) intervalProgress.style.strokeDashoffset = length * (1 - Math.min(surfaceInterval / MAX_INTERVAL, 1));

    updateGaugeVisuals('time', dive2Time, MAX_TIME, true, '-2');
    updateGaugeVisuals('depth', dive2Depth, MAX_DEPTH, false, '-2');

    const ppo2_2 = Planning.calculatePPO2(dive2Depth, gazO2pct);
    const timeTicks2 = calculateStopTicks(dive2Depth, gazO2pct, currentMajoration);
    if (timeGauge2) updateGaugeTicks('time-gauge-container-2', timeTicks2, MIN_TIME, MAX_TIME);

    renderStops(result2, stopsDisplay2);
    renderDiveDetails(diveDetails2, result2, dive2Depth, dive2Time, initTankPressure, ppo2_2);
}



function renderStops(result, containerElement) {
    containerElement.innerHTML = '';
    const trans = window.translations;

    if (result.is_out_of_table || result.is_surface_dive) {
        containerElement.innerHTML = `<div class="placeholder-text">${trans[currentLang].outOfTable}</div>`;
        return;
    }
    if (result.second_dive_not_authorized) {
        container.innerHTML = '';
        return;
    }

    const { stops } = result.profile;

    // Determine depths to display
    const stopDepths = Object.keys(stops).map(Number);
    const maxStopDepth = stopDepths.length > 0 ? Math.max(...stopDepths) : 0;
    // Default max is 15m, but if we have deeper stops, use the deepest stop (rounded to 3m)
    const maxDisplayDepth = Math.max(15, Math.ceil(maxStopDepth / 3) * 3);

    const depths = [];
    for (let d = maxDisplayDepth; d >= 3; d -= 3) {
        depths.push(d);
    }

    if (depths.length > 5) {
        containerElement.classList.add('compact-stops');
    } else {
        containerElement.classList.remove('compact-stops');
    }

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
            <div class="stop-depth">${d}${maxStopDepth >= 30 ? '' : 'm'}</div>
            <div class="stop-line" style="height: ${lineHeight}px"></div>
            <div class="stop-value-container">
                ${visualContent}
            </div>
        `;
        containerElement.appendChild(stopEl);
    });
}


function renderDiveDetails(container, result, diveDepth, diveTime, tankP, ppo2) {
    if (!container) return;
    container.innerHTML = '';
    const trans = window.translations;

    if (result.is_out_of_table || result.is_surface_dive || result.second_dive_not_authorized) {
        container.innerHTML = '';
        return;
    }

    const dtr = Planning.calculateDTR(diveDepth, result.profile.stops);
    const dtrFormatted = formatTime(dtr);

    const consumption = Planning.calculateGasConsumption(diveDepth, diveTime, result.profile, sac);
    const gasUsed = consumption.total;
    const pressureUsed = gasUsed / tankVolume;
    const remainingPressure = Math.floor(tankP - pressureUsed);

    const dtrHtml = `<div class="result-box important"><span class="result-label">${trans[currentLang].dtr}</span><span class="result-value">${dtrFormatted}</span></div>`;
    const reserveHtml = `<div class="result-box important reserve-box" style="cursor: pointer;"><span class="result-label">${trans[currentLang].reserve}</span><span class="result-value">${remainingPressure} bar</span></div>`;

    let nitroxHtml = `<div class="result-box important nitroxBox"><span class="result-label">ppO2 max</span><span class="result-value">${ppo2.toFixed(2)}</span></div>`;
    container.innerHTML = `<div class="results-row">${dtrHtml}${reserveHtml}${nitroxHtml}</div>`;

    const reserveBox = container.querySelector('.reserve-box');
    if (reserveBox) {
        if (remainingPressure < 0) {
            reserveBox.style.backgroundColor = '#e53935';
        } else if (remainingPressure <= RESERVE_PRESSURE_THRESHOLD) {
            reserveBox.style.backgroundColor = '#ff9800';
        }
        reserveBox.onclick = () => showGasBreakdown(consumption, remainingPressure);
    }

    if (ppo2 > PPO2_THRESHOLD_ORANGE) {
        const rb = container.querySelector('.nitroxBox');
        if (rb) rb.style.backgroundColor = '#ff9800';
    }
}

function showGasBreakdown(consumption, remainingPressure) {
    const breakdown = consumption.breakdown;
    const modal = document.getElementById("gas-modal");
    const title = document.getElementById("gas-breakdown-title");
    const list = document.getElementById("gas-breakdown-list");
    const trans = window.translations[currentLang];

    if (!modal || !list) return;

    const bar_total = Math.ceil(consumption.total / tankVolume);
    title.innerHTML = `${trans.gasBreakdownTitle}: ${bar_total} bar`;
    list.innerHTML = '';

    const addLine = (label, liters) => {
        const bar = Math.ceil(liters / tankVolume);
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.innerHTML = `<strong>${label}:</strong> ${bar} bar (${Math.round(liters)} L)`;
        list.appendChild(li);
    };

    if (breakdown.descent > 0) addLine(trans.descent, breakdown.descent);
    if (breakdown.bottom > 0) addLine(trans.bottom, breakdown.bottom);
    if (breakdown.ascent > 0) addLine(trans.ascent, breakdown.ascent);

    const stopDepths = Object.keys(breakdown.stops).map(Number).sort((a, b) => b - a);
    stopDepths.forEach(d => {
        addLine(`${trans.stopAt} ${d}m`, breakdown.stops[d]);
    });

    if (remainingPressure < 0) {
        const msg = document.createElement('div');
        msg.style.color = '#e53935';
        msg.style.marginTop = '20px';
        msg.style.fontWeight = 'bold';
        msg.textContent = trans.notEnoughGas;
        list.appendChild(msg);
    } else if (remainingPressure <= RESERVE_PRESSURE_THRESHOLD) {
        const msg = document.createElement('div');
        msg.style.color = '#ff9800';
        msg.style.marginTop = '20px';
        msg.style.fontWeight = 'bold';
        msg.textContent = trans.notEnoughReserve;
        list.appendChild(msg);
    }

    if (window.__openModal) {
        window.__openModal(modal);
    } else {
        modal.style.display = "block";
        modal.onclick = function () {
            modal.style.display = "none";
        };
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);

function isIOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
        // Alternative check for userAgent
        || /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function setupInstallLogic() {
    const installAppContainer = document.getElementById('install-app-container');
    const installAppBtn = document.getElementById('install-app-btn');

    if (isStandalone()) {
        if (installAppContainer) installAppContainer.style.display = 'none';
        return;
    }

    if (isIOS()) {
        if (installAppContainer) installAppContainer.style.display = 'flex';
    }

    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    deferredPrompt = null;
                    if (installAppContainer) installAppContainer.style.display = 'none';
                } else {
                    console.log('User dismissed the install prompt');
                }
            } else if (isIOS()) {
                const modal = document.getElementById("help-modal");
                if (modal) {
                    if (window.__openModal) window.__openModal(modal);
                    else modal.style.display = "block";
                    const installSection = document.getElementById('installation-section');
                    if (installSection) {
                        installSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        });
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installAppContainer = document.getElementById('install-app-container');
    if (installAppContainer) {
        installAppContainer.style.display = 'flex';
    }
});

window.addEventListener('appinstalled', (event) => {
    deferredPrompt = null;
    const installAppContainer = document.getElementById('install-app-container');
    if (installAppContainer) {
        installAppContainer.style.display = 'none';
    }
});

function setupModal() {
    const helpModal = document.getElementById("help-modal");
    const helpBtn = document.getElementById("help-link");
    const gasModal = document.getElementById("gas-modal");

    // Helper to open modal with focus trap
    function openModal(modal, opener) {
        if (!modal) return;
        modal.style.display = "block";
        modal.setAttribute('aria-hidden', 'false');
        const focusable = modal.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const previouslyFocused = opener || document.activeElement;

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal(modal, previouslyFocused);
                return;
            }
            if (e.key === 'Tab') {
                if (focusable.length === 0) {
                    e.preventDefault();
                    return;
                }
                // Trap focus
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        // Click on overlay to close
        function onClick(e) {
            closeModal(modal, previouslyFocused);
        }

        modal.__previouslyFocused = previouslyFocused;
        modal.__onKeyDown = onKeyDown;
        modal.__onClick = onClick;

        document.addEventListener('keydown', onKeyDown);
        modal.addEventListener('click', onClick);

        if (first) first.focus();
    }

    function closeModal(modal, returnFocus) {
        if (!modal) return;

        if (modal.id === 'help-modal') {
            localStorage.setItem('hasVisited', 'true');
        }

        modal.style.display = "none";
        modal.setAttribute('aria-hidden', 'true');
        if (modal.__onKeyDown) document.removeEventListener('keydown', modal.__onKeyDown);
        if (modal.__onClick) modal.removeEventListener('click', modal.__onClick);
        try {
            const prev = returnFocus || modal.__previouslyFocused;
            if (prev && typeof prev.focus === 'function') prev.focus();
        } catch (e) {
            // ignore
        }
    }

    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(helpModal, helpBtn);
        });

        // Show modal on first visit
        if (!localStorage.getItem('hasVisited')) {
            openModal(helpModal, null);
        }
    }


    // Display app version
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.textContent = 'Version ' + (window.APP_VERSION || '?');
    }

    // Replace simple style-based show/hide in other functions by exposing helpers
    window.__openModal = openModal;
    window.__closeModal = closeModal;
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
        const r1 = RADIUS - 3; // Slightly inside
        const r2 = RADIUS + 3; // Slightly outside

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
        const rText = RADIUS + 18;
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
        label: `${Math.floor(maxDepth)}m`,
        className: 'gauge-tick-warning'
    }];
}

function calculateStopTicks(depth, o2Pct, majoration = 0) {
    if (isGFMode) return []; // Only MN90 for now

    const ead = Planning.calculateEquivalentAirDepth(depth, o2Pct);

    // Find stops in table
    // Iterate time entries to find when stops appear or change
    const table = window.dataManager.getMN90();
    if (!table) return [];

    // Find closest depth in table >= actual depth
    const depths = Object.keys(table).map(d => parseInt(d)).sort((a, b) => a - b);
    const tableDepth = depths.find(d => d >= ead);
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
