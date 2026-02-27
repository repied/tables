// App State
const state = {
    dive1Depth: 40,
    dive1Time: 15,
    dive2Depth: 40,
    dive2Time: 15,
    initTankPressure: 200,
    sac: 15,
    tankVolume: 15,
    gazO2pct: 21,
    gazO2pct2: 21,
    isGFMode: false,
    currentGFLow: 85,
    currentGFHigh: 85,
    currentGFLow2: 85,
    currentGFHigh2: 85,
    isGFLow2Locked: true,
    isGFHigh2Locked: true,
    surfaceInterval: 60 * 3,
    currentLang: localStorage.getItem('selectedLang') || 'fr',
    theme: localStorage.getItem('theme') || 'light'
};

// UI Elements Cache
const el = {};

// Constants
const RESERVE_PRESSURE_THRESHOLD = 50;
const PPO2_THRESHOLD_ORANGE = 1.5;

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
const MAX_INTERVAL = 60 * 12;
const MIN_INTERVAL = 30;
const STEP_INTERVAL = 15;

const SHARE_ANDROID_SVG = `<svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
const SHARE_APPLE_SVG = `<svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`;
const CAMERA_SVG = `<svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;

// PWA logic
let deferredPrompt;

// Update throttling
let updateRequested = false;

function triggerUpdate() {
    if (updateRequested) return;
    updateRequested = true;
    requestAnimationFrame(() => {
        updateUI();
        saveStateToLocalStorage();
        updateRequested = false;
    });
}

// Initialize
async function init() {
    const success = await window.dataManager.loadAllData();
    if (!success) {
        alert("Erreur de chargement des données. Vérifiez la connexion.");
        return;
    }

    loadStateFromLocalStorage();
    cacheElements();
    initGauges();
    setupInteractions();
    setupModal();
    setupSharing();
    loadStateFromUrl();
    setupInstallLogic();

    if (el['lang-toggle']) {
        el['lang-toggle'].checked = (state.currentLang === 'en');
        el['lang-toggle'].addEventListener('change', () => {
            state.currentLang = el['lang-toggle'].checked ? 'en' : 'fr';
            localStorage.setItem('selectedLang', state.currentLang);
            translateUI();
            updateFooterIcons();
            triggerUpdate();
        });
    }

    if (el['theme-toggle']) {
        el['theme-toggle'].checked = (state.theme === 'dark');
        updateTheme();
        el['theme-toggle'].addEventListener('change', () => {
            state.theme = el['theme-toggle'].checked ? 'dark' : 'light';
            localStorage.setItem('theme', state.theme);
            updateTheme();
        });
    }

    translateUI();
    updateFooterIcons();
}

function updateFooterIcons() {
    const shareLink = document.getElementById('share-link');
    const trans = window.translations[state.currentLang];

    if (shareLink) {
        shareLink.innerHTML = isIOS() ? SHARE_APPLE_SVG : SHARE_ANDROID_SVG;
        shareLink.title = trans.share;
        shareLink.setAttribute('aria-label', trans.share);
    }
}

function updateTheme() {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (state.theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
    } else {
        document.body.classList.remove('dark-mode');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#1e2130');
    }
}

function cacheElements() {
    const ids = [
        'time-gauge-container', 'depth-gauge-container', 'pressure-gauge-container',
        'sac-gauge-container', 'volume-gauge-container', 'o2-gauge-container',
        'time-display', 'depth-display', 'pressure-display', 'sac-display',
        'volume-display', 'o2-display', 'time-progress', 'depth-progress',
        'pressure-progress', 'sac-progress', 'volume-progress', 'o2-progress',
        'mode-mn90', 'mode-gf', 'gf-low-gauge-container', 'gf-high-gauge-container',
        'gf-low-display', 'gf-high-display', 'gf-low-progress', 'gf-high-progress',
        'gf-low-gauge-container-2', 'gf-high-gauge-container-2',
        'gf-low-display-2', 'gf-high-display-2', 'gf-low-progress-2', 'gf-high-progress-2',
        'gf-low-lock-2', 'gf-high-lock-2',
        'stops-display', 'dive-details', 'gps-display-1', 'successive-controls',
        'majoration-display', 'successive-header-text', 'interval-gauge-container',
        'interval-display', 'interval-progress', 'time-gauge-container-2',
        'depth-gauge-container-2', 'o2-gauge-container-2', 'time-display-2', 'depth-display-2', 'o2-display-2',
        'time-progress-2', 'depth-progress-2', 'o2-progress-2', 'stops-display-2', 'dive-details-2',
        'lang-toggle', 'theme-toggle', 'gas-modal', 'gas-breakdown-list', 'gas-breakdown-total',
        'help-modal', 'help-link', 'checklist-modal', 'app-version', 'install-app-container',
        'install-app-btn', 'installation-section'
    ];
    ids.forEach(id => el[id] = document.getElementById(id));
}

function translateUI() {
    const elements = document.querySelectorAll('[data-i18n]');
    const trans = window.translations;
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (trans && trans[state.currentLang][key]) {
            element.innerHTML = trans[state.currentLang][key];
        }
    });

    const helpContainer = document.getElementById('help-markdown-content');
    if (helpContainer && typeof marked !== 'undefined') {
        fetch(`./assets/help_${state.currentLang}.md`)
            .then(response => {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.text();
            })
            .then(text => {
                helpContainer.innerHTML = marked.parse(text);
            })
            .catch(err => {
                console.error('Failed to load help markdown', err);
                helpContainer.innerHTML = "<p>Error loading help content.</p>";
            });
    }

    const checklistContainer = document.getElementById('checklist-markdown-content');
    if (checklistContainer && typeof marked !== 'undefined') {
        fetch(`./assets/checklist_${state.currentLang}.md`)
            .then(response => {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.text();
            })
            .then(text => {
                checklistContainer.innerHTML = marked.parse(text);
            })
            .catch(err => {
                console.error('Failed to load checklist markdown', err);
                checklistContainer.innerHTML = "<p>Error loading checklist content.</p>";
            });
    }
}

function initGauges() {
    if (!el['time-progress']) return;
    const length = el['time-progress'].getTotalLength();

    const progresses = [
        'time-progress', 'depth-progress', 'pressure-progress', 'sac-progress',
        'volume-progress', 'o2-progress', 'time-progress-2', 'depth-progress-2',
        'o2-progress-2', 'gf-low-progress', 'gf-high-progress',
        'gf-low-progress-2', 'gf-high-progress-2', 'interval-progress'
    ];

    progresses.forEach(p => {
        if (el[p]) {
            el[p].style.strokeDasharray = length;
            el[p].style.strokeDashoffset = length;
        }
    });

    triggerUpdate();
}

function setupInteractions() {
    setupGaugeInteraction(el['time-gauge-container'], () => state.dive1Time, (val) => state.dive1Time = val, MIN_TIME, MAX_TIME, 1);
    setupGaugeInteraction(el['depth-gauge-container'], () => state.dive1Depth, (val) => state.dive1Depth = val, MIN_DEPTH, MAX_DEPTH, 0.2);
    setupGaugeInteraction(el['pressure-gauge-container'], () => state.initTankPressure, (val) => state.initTankPressure = val, MIN_TANK_PRESSURE, MAX_TANK_PRESSURE, 1);
    setupGaugeInteraction(el['sac-gauge-container'], () => state.sac, (val) => state.sac = val, MIN_SAC, MAX_SAC, 0.5);
    setupGaugeInteraction(el['volume-gauge-container'], () => state.tankVolume, (val) => state.tankVolume = val, MIN_TANK_VOLUME, MAX_TANK_VOLUME, 1);
    setupGaugeInteraction(el['o2-gauge-container'], () => state.gazO2pct, (val) => state.gazO2pct = val, MIN_O2_pct, MAX_O2_pct, 1);

    setupGaugeInteraction(el['gf-low-gauge-container'], () => state.currentGFLow, (val) => state.currentGFLow = val, MIN_GF_pct, MAX_GF_pct, 0.5);
    setupGaugeInteraction(el['gf-high-gauge-container'], () => state.currentGFHigh, (val) => state.currentGFHigh = val, MIN_GF_pct, MAX_GF_pct, 0.5);
    setupGaugeInteraction(el['gf-low-gauge-container-2'], () => state.currentGFLow2, (val) => state.currentGFLow2 = val, MIN_GF_pct, MAX_GF_pct, 0.5);
    setupGaugeInteraction(el['gf-high-gauge-container-2'], () => state.currentGFHigh2, (val) => state.currentGFHigh2 = val, MIN_GF_pct, MAX_GF_pct, 0.5);

    // Lock Logic Listeners
    if (el['gf-low-lock-2']) {
        el['gf-low-lock-2'].addEventListener('click', (e) => {
            e.stopPropagation();
            state.isGFLow2Locked = !state.isGFLow2Locked;
            triggerUpdate();
        });
        el['gf-low-lock-2'].addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    if (el['gf-high-lock-2']) {
        el['gf-high-lock-2'].addEventListener('click', (e) => {
            e.stopPropagation();
            state.isGFHigh2Locked = !state.isGFHigh2Locked;
            triggerUpdate();
        });
        el['gf-high-lock-2'].addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    if (el['mode-mn90'] && el['mode-gf']) {
        el['mode-mn90'].addEventListener('click', () => {
            state.isGFMode = false;
            triggerUpdate();
        });
        el['mode-gf'].addEventListener('click', () => {
            state.isGFMode = true;
            triggerUpdate();
        });
    }

    setupGaugeInteraction(el['time-gauge-container-2'], () => state.dive2Time, (val) => state.dive2Time = val, MIN_TIME, MAX_TIME, 1);
    setupGaugeInteraction(el['depth-gauge-container-2'], () => state.dive2Depth, (val) => state.dive2Depth = val, MIN_DEPTH, MAX_DEPTH, 0.1);
    setupGaugeInteraction(el['o2-gauge-container-2'], () => state.gazO2pct2, (val) => state.gazO2pct2 = val, MIN_O2_pct, MAX_O2_pct, 1);
    setupGaugeInteraction(el['interval-gauge-container'], () => state.surfaceInterval, (val) => state.surfaceInterval = val, MIN_INTERVAL, MAX_INTERVAL, 5);
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
            triggerUpdate();

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
                triggerUpdate();
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
        const map = {
            'ArrowUp': cur + step, 'ArrowRight': cur + step,
            'ArrowDown': cur - step, 'ArrowLeft': cur - step,
            'PageUp': cur + Math.max(1, step * 5), 'PageDown': cur - Math.max(1, step * 5),
            'Home': min, 'End': max
        };
        if (map[e.key] !== undefined) {
            setValue(Math.max(min, Math.min(max, map[e.key])));
            triggerUpdate();
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
            showGaugeValueDropdown(gaugeElement, getValue(), setValue, min, max);
            e.preventDefault();
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
    const trans = window.translations?.[state.currentLang];
    const titleKey = `${baseKey}-title`;
    const gaugeName = (trans?.[titleKey] || trans?.[baseKey] || baseKey.replace(/-/g, ' ')).toUpperCase();
    const header = document.createElement('div');
    header.className = 'gauge-dropdown-header';
    header.innerHTML = `
        <span style="flex-grow:1">${gaugeName}</span>
    `;

    content.appendChild(header);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gauge-dropdown-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeDropdown();
    };
    header.appendChild(closeBtn);

    // List Container
    const listContainer = document.createElement('div');
    listContainer.style.overflowY = 'auto';
    listContainer.style.flexGrow = '1';

    // Step Logic
    let step = 1;
    if (baseKey === 'interval') {
        step = STEP_INTERVAL;
    } else if (max - min < 60 && (min % 1 !== 0 || max % 1 !== 0 || currentValue % 1 !== 0)) {
        step = 0.5;
    }

    for (let val = min; val <= max; val += step) {
        const item = document.createElement('div');
        item.className = 'gauge-dropdown-item';
        // For the interval and time gauges, display values as hh:mm for better readability
        const displayText = (baseKey === 'interval' || baseKey === 'time') ? formatTime(val) : val;
        item.textContent = displayText;
        if (Math.abs(val - currentValue) < 0.1) {
            item.classList.add('selected');
        }
        item.onclick = () => {
            setValue(val);
            triggerUpdate();
            closeDropdown();
        };
        listContainer.appendChild(item);
    }
    content.appendChild(listContainer);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Show immediately
    overlay.classList.add('visible');

    // Scroll to selected
    const selected = content.querySelector('.selected');
    if (selected) {
        selected.scrollIntoView({ block: 'center' });
    }

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
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
}

function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

function updateGaugeVisuals(type, value, max, isTime = false, suffix = '') {
    const progressEl = el[`${type}-progress${suffix}`];
    if (progressEl) {
        const length = progressEl.getTotalLength();
        progressEl.style.strokeDashoffset = length * (1 - Math.min(value / max, 1));
    }

    const displayEl = el[`${type}-display${suffix}`];
    if (displayEl) {
        displayEl.textContent = isTime ? formatTime(value) : value;
    }

    // Update ARIA
    const containerEl = el[`${type}-gauge-container${suffix}`];
    if (containerEl) {
        containerEl.setAttribute('aria-valuenow', String(value));
        containerEl.setAttribute('aria-valuetext', isTime ? formatTime(value) : String(value));
    }
}

const LOCK_SVG = `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2z"/></svg>`;
const UNLOCK_SVG = `<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>`;

function updateLockState(container, lockIcon, isLocked) {
    if (container) {
        if (isLocked) container.classList.add('locked');
        else container.classList.remove('locked');
    }
    if (lockIcon) {
        lockIcon.innerHTML = isLocked ? LOCK_SVG : UNLOCK_SVG;
    }
}

function updateUI() {
    try {
        _updateUI_impl();
    } catch (e) {
        console.error("updateUI error", e);
    }
}

function _updateUI_impl() {
    document.body.classList.toggle('gf-mode', state.isGFMode);

    // Lock Logic for GF2
    if (state.isGFMode) {
        if (state.isGFLow2Locked) {
            state.currentGFLow2 = state.currentGFLow;
        }
        if (state.isGFHigh2Locked) {
            state.currentGFHigh2 = state.currentGFHigh;
        }
    }

    // Update Lock Icons & Classes
    updateLockState(el['gf-low-gauge-container-2'], el['gf-low-lock-2'], state.isGFLow2Locked);
    updateLockState(el['gf-high-gauge-container-2'], el['gf-high-lock-2'], state.isGFHigh2Locked);

    // Common Calcs
    const length = el['time-progress'] ? el['time-progress'].getTotalLength() : 0;

    // --- DIVE 1 UI ---
    updateGaugeVisuals('time', state.dive1Time, MAX_TIME, true);
    updateGaugeVisuals('depth', state.dive1Depth, MAX_DEPTH);
    updateGaugeVisuals('pressure', state.initTankPressure, MAX_TANK_PRESSURE);
    updateGaugeVisuals('sac', state.sac, MAX_SAC);
    updateGaugeVisuals('volume', state.tankVolume, MAX_TANK_VOLUME);
    updateGaugeVisuals('o2', state.gazO2pct, MAX_O2_pct);

    if (el['gf-low-display']) {
        el['gf-low-display'].textContent = state.currentGFLow;
        el['gf-high-display'].textContent = state.currentGFHigh;
        if (el['gf-low-progress']) el['gf-low-progress'].style.strokeDashoffset = length * (1 - Math.min(state.currentGFLow / 100, 1));
        if (el['gf-high-progress']) el['gf-high-progress'].style.strokeDashoffset = length * (1 - Math.min(state.currentGFHigh / 100, 1));
    }

    // --- DIVE 1 CALCULATION ---
    const ppo2_1 = Planning.calculatePPO2(state.dive1Depth, state.gazO2pct);
    const ppo2Ticks1 = calculatePPO2Tick(state.dive1Depth, state.gazO2pct);

    updateGaugeTicks('depth-gauge-container', ppo2Ticks1, MIN_DEPTH, MAX_DEPTH);

    const timeTicks1 = calculateStopTicks(state.dive1Depth, state.gazO2pct, 0, {
        gfLow: state.currentGFLow,
        gfHigh: state.currentGFHigh
    });
    updateGaugeTicks('time-gauge-container', timeTicks1, MIN_TIME, MAX_TIME);

    let result1;
    if (state.isGFMode) {
        result1 = Planning.calculateBuhlmannPlan({
            bottomTime: state.dive1Time, maxDepth: state.dive1Depth,
            gfLow: state.currentGFLow, gfHigh: state.currentGFHigh,
            fN2: (100 - state.gazO2pct) / 100,
            ascentRate: Planning.ASCENT_RATE_GF
        });
    } else {
        const ead1 = Planning.calculateEquivalentAirDepth(state.dive1Depth, state.gazO2pct);
        result1 = Planning.getMN90Profile(ead1, state.dive1Time);
    }

    renderStops(result1, el['stops-display']);

    if (el['gps-display-1']) {
        if (result1 && result1.profile && result1.profile.group && result1.profile.group !== 'GF_GPS') {
            el['gps-display-1'].innerHTML = `<div class="gps-badge">${window.translations[state.currentLang].gps} ${result1.profile.group}</div>`;
            el['gps-display-1'].style.visibility = 'visible';
        } else {
            el['gps-display-1'].innerHTML = '';
            el['gps-display-1'].style.visibility = 'hidden';
        }
    }

    renderDiveDetails(el['dive-details'], result1, state.dive1Depth, state.dive1Time, state.initTankPressure, ppo2_1);


    // --- DIVE 2 UI ---
    if (el['successive-header-text']) el['successive-header-text'].textContent = window.translations[state.currentLang].secondDive;


    let result2, currentMajoration = 0;
    let currentTensions = null;
    if (state.isGFMode) {
        // Tension evolution
        const surface_air_alv_ppn2 = Planning.SURFACE_AIR_ALV_PPN2;
        currentTensions = result1 ? result1.finalTensions : null;
        const sursaturationBeforePct = currentTensions ? 100 * (Math.max(...currentTensions) - surface_air_alv_ppn2) / surface_air_alv_ppn2 : 0;
        if (currentTensions) {
            currentTensions = Planning.updateAllTensions(currentTensions, surface_air_alv_ppn2, state.surfaceInterval);
        }
        const sursaturationAfterPct = currentTensions ? 100 * (Math.max(...currentTensions) - surface_air_alv_ppn2) / surface_air_alv_ppn2 : 0;

        if (el['majoration-display']) {
            const tensionEvolutionLabel = window.translations[state.currentLang].tensionEvolution;
            el['majoration-display'].innerHTML = tensionEvolutionLabel + `${sursaturationBeforePct.toFixed(0)}%` + ` → ${sursaturationAfterPct.toFixed(0)}%`;
            el['majoration-display'].style.display = 'block';
        }

        result2 = Planning.calculateBuhlmannPlan({
            bottomTime: state.dive2Time, maxDepth: state.dive2Depth,
            gfLow: state.currentGFLow2, gfHigh: state.currentGFHigh2,
            fN2: (100 - state.gazO2pct2) / 100,
            initialTensions: currentTensions,
            ascentRate: Planning.ASCENT_RATE_GF
        });

    } else {
        const prevGroup = (result1 && result1.profile && result1.profile.group) ? result1.profile.group : null;
        const ead2 = Planning.calculateEquivalentAirDepth(state.dive2Depth, state.gazO2pct2);
        const succResult = Planning.calculateSuccessive(prevGroup, state.surfaceInterval, ead2);

        currentMajoration = (succResult && !succResult.error) ? succResult.majoration : 0;
        const effectiveTime2 = state.dive2Time + currentMajoration;
        result2 = Planning.getMN90Profile(ead2, effectiveTime2);

        if (el['majoration-display']) {
            let majText = "Error";
            if (succResult && !succResult.error) {
                majText = `+${currentMajoration} min`;
                el['majoration-display'].textContent = `${window.translations[state.currentLang].majoration}: ${majText} `;
                el['majoration-display'].style.display = 'block';
            } else if (succResult && succResult.error) {
                el['majoration-display'].style.display = 'none';
                result2.second_dive_not_authorized = true;
            }
        }
    }

    if (el['interval-display']) el['interval-display'].textContent = formatTime(state.surfaceInterval);
    if (el['interval-progress']) el['interval-progress'].style.strokeDashoffset = length * (1 - Math.min(state.surfaceInterval / MAX_INTERVAL, 1));

    updateGaugeVisuals('time', state.dive2Time, MAX_TIME, true, '-2');
    updateGaugeVisuals('depth', state.dive2Depth, MAX_DEPTH, false, '-2');
    updateGaugeVisuals('o2', state.gazO2pct2, MAX_O2_pct, false, '-2');

    if (el['gf-low-display-2']) {
        el['gf-low-display-2'].textContent = state.currentGFLow2;
        el['gf-high-display-2'].textContent = state.currentGFHigh2;
        if (el['gf-low-progress-2']) el['gf-low-progress-2'].style.strokeDashoffset = length * (1 - Math.min(state.currentGFLow2 / 100, 1));
        if (el['gf-high-progress-2']) el['gf-high-progress-2'].style.strokeDashoffset = length * (1 - Math.min(state.currentGFHigh2 / 100, 1));
    }

    const ppo2_2 = Planning.calculatePPO2(state.dive2Depth, state.gazO2pct2);
    const ppo2Ticks2 = calculatePPO2Tick(state.dive2Depth, state.gazO2pct2);
    updateGaugeTicks('depth-gauge-container-2', ppo2Ticks2, MIN_DEPTH, MAX_DEPTH);

    const timeTicks2 = calculateStopTicks(state.dive2Depth, state.gazO2pct2, currentMajoration, {
        gfLow: state.currentGFLow2,
        gfHigh: state.currentGFHigh2,
        initialTensions: currentTensions
    });
    updateGaugeTicks('time-gauge-container-2', timeTicks2, MIN_TIME, MAX_TIME);

    renderStops(result2, el['stops-display-2']);
    renderDiveDetails(el['dive-details-2'], result2, state.dive2Depth, state.dive2Time, state.initTankPressure, ppo2_2);
}



function renderStops(result, containerElement) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    const trans = window.translations;

    if (result.is_out_of_table || result.is_surface_dive) {
        containerElement.innerHTML = `<div class="placeholder-text">${trans[state.currentLang].outOfTable}</div>`;
        return;
    }
    if (result.second_dive_not_authorized) {
        containerElement.innerHTML = '';
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

    const ascentRate = state.isGFMode ? Planning.ASCENT_RATE_GF : Planning.ASCENT_RATE_MN90;
    const dtr = Planning.calculateDTR(diveDepth, result.profile.stops, ascentRate);
    const dtrFormatted = formatTime(dtr);

    const consoLiters = Planning.calculateGasConsumptionLiters(diveDepth, diveTime, result.profile, state.sac, ascentRate);
    const gasUsed = consoLiters.total;
    const pressureUsed = gasUsed / state.tankVolume;
    const remainingPressure = Math.floor(tankP - pressureUsed);

    const dtrHtml = `<div class="result-box important"><span class="result-label">${trans[state.currentLang].dtr}</span><span class="result-value">${dtrFormatted}</span></div>`;
    const reserveHtml = `<div class="result-box important reserve-box" style="cursor: pointer;"><span class="result-label">${trans[state.currentLang].reserve}</span><span class="result-value">${remainingPressure} bar</span></div>`;

    let nitroxHtml = `<div class="result-box important nitroxBox"><span class="result-label">ppO2 max</span><span class="result-value">${ppo2.toFixed(2)}</span></div>`;
    container.innerHTML = `<div class="results-row">${dtrHtml}${reserveHtml}${nitroxHtml}</div>`;

    const reserveBox = container.querySelector('.reserve-box');
    if (reserveBox) {
        if (remainingPressure < 0) {
            reserveBox.style.backgroundColor = '#e53935';
        } else if (remainingPressure <= RESERVE_PRESSURE_THRESHOLD) {
            reserveBox.style.backgroundColor = '#ff9800';
        }
        reserveBox.onclick = () => showGasBreakdown(consoLiters, remainingPressure);
    }

    if (ppo2 > PPO2_THRESHOLD_ORANGE) {
        const rb = container.querySelector('.nitroxBox');
        if (rb) rb.style.backgroundColor = '#ff9800';
    }
}

function showGasBreakdown(consoLiters, remainingPressure) {
    if (!consoLiters || !consoLiters.breakdown) return;
    const breakdown = consoLiters.breakdown;

    // Fallbacks for critical elements
    const modal = el['gas-modal'] || document.getElementById('gas-modal');
    const list = el['gas-breakdown-list'] || document.getElementById('gas-breakdown-list');
    const total = el['gas-breakdown-total'] || document.getElementById('gas-breakdown-total');

    if (!modal || !list || !total) return;

    const trans = window.translations[state.currentLang];
    if (!trans) return;

    list.innerHTML = '';

    const addLine = (label, liters) => {
        const bar = Math.ceil(liters / state.tankVolume);
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.innerHTML = `<strong>${label}:</strong> ${bar} bar (${Math.round(liters)} L)`;
        list.appendChild(li);
    };

    const bar_total = Math.ceil(consoLiters.total / state.tankVolume);
    total.innerHTML = `${trans.total}: ${bar_total} bar (${Math.round(consoLiters.total)} L)`;

    if (breakdown.descent > 0) addLine(trans.descent, breakdown.descent);
    if (breakdown.bottom > 0) addLine(trans.bottom, breakdown.bottom);
    if (breakdown.ascent > 0) addLine(trans.ascent, breakdown.ascent);

    if (breakdown.stops) {
        const stopDepths = Object.keys(breakdown.stops).map(Number).sort((a, b) => b - a);
        stopDepths.forEach(d => {
            addLine(`${trans.stopAt} ${d}m`, breakdown.stops[d]);
        });
    }

    if (remainingPressure < 0) {
        const msg = document.createElement('div');
        msg.style.color = '#e53935';
        total.style.color = '#e53935';
        msg.style.marginTop = '20px';
        msg.style.fontWeight = 'bold';
        msg.innerHTML = trans.notEnoughGas;
        list.appendChild(msg);
    } else if (remainingPressure <= RESERVE_PRESSURE_THRESHOLD) {
        const msg = document.createElement('div');
        msg.style.color = '#ff9800';
        total.style.color = '#ff9800';
        msg.style.marginTop = '20px';
        msg.style.fontWeight = 'bold';
        msg.innerHTML = trans.notEnoughReserve;
        list.appendChild(msg);
    }

    if (typeof window.__openModal === 'function') {
        window.__openModal(modal);
    } else {
        modal.style.display = "block";
        modal.onclick = (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
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
    const installAppContainer = el['install-app-container'];
    const installAppBtn = el['install-app-btn'];

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
                    deferredPrompt = null;
                    if (installAppContainer) installAppContainer.style.display = 'none';
                }
            } else if (isIOS()) {
                const modal = el['help-modal'];
                if (modal) {
                    if (window.__openModal) window.__openModal(modal);
                    else modal.style.display = "block";
                    const installSection = el['installation-section'];
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
    const installAppContainer = el['install-app-container'];
    if (installAppContainer) {
        installAppContainer.style.display = 'flex';
    }
});

window.addEventListener('appinstalled', (event) => {
    deferredPrompt = null;
    const installAppContainer = el['install-app-container'];
    if (installAppContainer) {
        installAppContainer.style.display = 'none';
    }
});

function setupModal() {
    const helpModal = el['help-modal'];
    const helpBtn = el['help-link'];
    const checklistModal = el['checklist-modal'];
    const helpContainer = document.getElementById('help-markdown-content');

    // Handle clicks on links inside the help markdown (like the checklist link)
    if (helpContainer) {
        helpContainer.addEventListener('click', (e) => {
            const link = e.target.closest('a[href="#checklist"]');
            if (link) {
                e.preventDefault();
                closeModal(helpModal);
                openModal(checklistModal, helpBtn);
            }
        });
    }

    // Helper to open modal with focus trap
    function openModal(modal, opener, onClose) {
        if (!modal) return;
        modal.style.display = "block";
        modal.scrollTop = 0;
        modal.__onClose = onClose;
        modal.setAttribute('aria-hidden', 'false');

        // Focus the title for accessibility and to ensure we start at the top
        const titleId = modal.getAttribute('aria-labelledby');
        const title = titleId ? document.getElementById(titleId) : null;

        const focusable = modal.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        const first = title || focusable[0];
        const last = focusable[focusable.length - 1] || first;
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

        // Click on anywhere to close, except on links
        function onClick(e) {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            closeModal(modal, previouslyFocused);
        }

        modal.__previouslyFocused = previouslyFocused;
        modal.__onKeyDown = onKeyDown;
        modal.__onClick = onClick;

        document.addEventListener('keydown', onKeyDown);
        modal.addEventListener('click', onClick);

        if (first) first.focus({ preventScroll: true });
    }

    function closeModal(modal, returnFocus) {
        if (!modal) return;

        if (modal.id === 'help-modal') {
            localStorage.setItem('hasVisited', 'true');
        }

        if (modal.__onClose) {
            modal.__onClose();
            modal.__onClose = null;
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
    }

    if (helpBtn && helpModal) {
        // Show modal on first visit
        if (!localStorage.getItem('hasVisited')) {
            openModal(helpModal, null);
        }
    }


    // Display app version
    const versionElement = el['app-version'];
    if (versionElement) {
        versionElement.textContent = 'Version ' + (window.APP_VERSION || '?');
    }

    // Replace simple style-based show/hide in other functions by exposing helpers
    window.__openModal = openModal;
    window.__closeModal = closeModal;
    window.closeScanModal = closeScanModal;
}

// ----------------------------------------------------------------------------
// Gauge Ticks Features
// ----------------------------------------------------------------------------

function updateGaugeTicks(gaugeContainerId, ticks, min, max) {
    const container = el[gaugeContainerId] || document.getElementById(gaugeContainerId);
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

function calculateStopTicks(depth, o2Pct, majoration = 0, gfContext = {}) {
    if (state.isGFMode) {
        return calculateGFTicks(depth, o2Pct, gfContext);
    }

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

function calculateGFTicks(depth, o2Pct, context = {}) {
    const gfLow = context.gfLow ?? state.currentGFLow;
    const gfHigh = context.gfHigh ?? state.currentGFHigh;
    const initialTensions = context.initialTensions || null;
    const MAX_SEARCH_TIME = 120; // Minutes

    // 1. Initial Check at Max Time
    const maxPlan = Planning.calculateBuhlmannPlan({
        bottomTime: MAX_SEARCH_TIME,
        maxDepth: depth,
        gfLow: gfLow,
        gfHigh: gfHigh,
        fN2: (100 - o2Pct) / 100,
        initialTensions: initialTensions,
        ascentRate: Planning.ASCENT_RATE_GF
    });

    const stopsAtMax = maxPlan.profile.stops;
    const stopDepths = Object.keys(stopsAtMax)
        .map(Number)
        .filter(d => d <= 15) // Only consider stops <= 15m
        .sort((a, b) => b - a); // Deepest first (e.g. 15, 12, 9, 6, 3)

    if (stopDepths.length === 0) return [];

    const bounds = {};
    stopDepths.forEach(d => {
        bounds[d] = { low: 0, high: MAX_SEARCH_TIME, candidate: null };
    });

    for (const targetDepth of stopDepths) {
        let { low, high } = bounds[targetDepth];

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);

            const result = Planning.calculateBuhlmannPlan({
                bottomTime: mid,
                maxDepth: depth,
                gfLow: gfLow,
                gfHigh: gfHigh,
                fN2: (100 - o2Pct) / 100,
                initialTensions: initialTensions,
                ascentRate: Planning.ASCENT_RATE_GF
            });

            const stops = result.profile.stops;
            const depths = Object.keys(stops).map(Number);
            const maxStopDepth = depths.length > 0 ? Math.max(...depths) : 0;

            if (stops[targetDepth]) {
                // Found the specific stop. It appears at 'mid' or earlier.
                bounds[targetDepth].candidate = mid;
                high = mid - 1;
            } else {
                // Stop not found. It appears later.
                low = mid + 1;
            }
        }
    }

    const ticks = [];
    stopDepths.forEach(d => {
        const time = bounds[d].candidate;
        if (time !== null && time > 0) {
            ticks.push({
                value: time,
                label: `${d}m`,
                className: 'gauge-tick-stop'
            });
        }
    });

    return ticks;
}

/* --- QR Code & Sharing --- */
function setupSharing() {
    const shareLink = document.getElementById('share-link');
    if (shareLink) {
        shareLink.addEventListener('click', (e) => {
            e.preventDefault();
            openShareModal();
        });
    }

    const modalScanBtn = document.getElementById('modal-scan-btn');
    if (modalScanBtn) {
        const scanIconContainer = document.getElementById('scan-icon-container');
        if (scanIconContainer) scanIconContainer.innerHTML = CAMERA_SVG;
        modalScanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Close share modal first
            const shareModal = document.getElementById('share-modal');
            if (window.__closeModal) window.__closeModal(shareModal);
            openScanModal();
        });
    }

    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyShareLink);
    }

    const cancelScanBtn = document.getElementById('cancel-scan-btn');
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', closeScanModal);
    }
}

function openShareModal() {
    const modal = document.getElementById('share-modal');
    if (!modal) return;

    // Generate Compact Link
    const data = [
        state.dive1Depth,
        state.dive1Time,
        state.dive2Depth,
        state.dive2Time,
        state.surfaceInterval,
        state.gazO2pct,
        state.gazO2pct2,
        state.initTankPressure,
        state.sac,
        state.tankVolume,
        state.isGFMode ? 1 : 0,
        state.currentGFLow,
        state.currentGFHigh
    ].join(',');

    const encoded = btoa(data);
    const params = new URLSearchParams();
    params.set('p', encoded);

    const url = window.location.origin + window.location.pathname + '?' + params.toString();

    const input = document.getElementById('share-link-input');
    if (input) input.value = url;

    const container = document.getElementById('qrcode-container');
    if (container) {
        container.innerHTML = '';
        if (typeof qrcode !== 'undefined') {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(url);
                qr.make();
                // Create SVG with scalable option for better quality
                container.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
            } catch (e) {
                console.error("QR Code generation failed", e);
            }
        }
    }

    if (window.__openModal) window.__openModal(modal);
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('copy-link-btn');
            const originalText = btn.getAttribute('data-i18n') ? window.translations[state.currentLang][btn.getAttribute('data-i18n')] : btn.innerText;
            btn.innerText = "Copied!";
            setTimeout(() => {
                btn.innerText = originalText;
            }, 2000);
        });
    } else {
        document.execCommand('copy');
        alert("Copied to clipboard");
    }
}

let scanStream = null;
let scanInterval = null;

async function openScanModal() {
    const modal = document.getElementById('scan-modal');
    if (!modal) return;

    if (window.__openModal) window.__openModal(modal);

    const video = document.getElementById('scan-video');
    const canvas = document.getElementById('scan-canvas');
    const status = document.getElementById('scan-status');

    if (!video || !canvas) return;

    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = scanStream;
        video.setAttribute("playsinline", true);
        video.play();

        scanInterval = setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        handleScan(code.data);
                    }
                }
            }
        }, 200);

        if (status) status.innerText = window.translations[state.currentLang].scanStatusWaiting || "Waiting...";

    } catch (err) {
        console.error(err);
        if (status) status.innerText = (window.translations[state.currentLang].cameraError || "Camera Error") + ": " + err.message;
    }
}

function closeScanModal() {
    const modal = document.getElementById('scan-modal');

    if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        scanStream = null;
    }

    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    if (modal && window.__closeModal) window.__closeModal(modal);
}

function handleScan(data) {
    try {
        const url = new URL(data);
        const params = url.searchParams;
        if (applyParams(params)) {
            closeScanModal();
            triggerUpdate();
        }
    } catch (e) {
        console.error("Invalid QR Code", e);
    }
}

function applyParams(params) {
    let changed = false;

    // Handle Compact Format
    if (params.has('p')) {
        try {
            const decoded = atob(params.get('p')).split(',');
            if (decoded.length >= 10) {
                state.dive1Depth = parseInt(decoded[0]);
                state.dive1Time = parseInt(decoded[1]);
                state.dive2Depth = parseInt(decoded[2]);
                state.dive2Time = parseInt(decoded[3]);
                state.surfaceInterval = parseInt(decoded[4]);
                state.gazO2pct = parseInt(decoded[5]);
                state.gazO2pct2 = parseInt(decoded[6]);
                state.initTankPressure = parseInt(decoded[7]);
                state.sac = parseInt(decoded[8]);
                state.tankVolume = parseInt(decoded[9]);
                if (decoded.length >= 13) {
                    state.isGFMode = decoded[10] === '1';
                    state.currentGFLow = parseInt(decoded[11]);
                    state.currentGFHigh = parseInt(decoded[12]);
                }
                changed = true;
            }
        } catch (e) {
            console.error("Failed to decode compact params", e);
        }
    }

    // Fallback/Legacy Format
    if (params.has('d1')) { state.dive1Depth = parseInt(params.get('d1')); changed = true; }
    if (params.has('t1')) { state.dive1Time = parseInt(params.get('t1')); changed = true; }
    if (params.has('d2')) { state.dive2Depth = parseInt(params.get('d2')); changed = true; }
    if (params.has('t2')) { state.dive2Time = parseInt(params.get('t2')); changed = true; }
    if (params.has('si')) { state.surfaceInterval = parseInt(params.get('si')); changed = true; }
    if (params.has('g1')) { state.gazO2pct = parseInt(params.get('g1')); changed = true; }
    if (params.has('g2')) { state.gazO2pct2 = parseInt(params.get('g2')); changed = true; }
    if (params.has('p')) { state.initTankPressure = parseInt(params.get('p')); changed = true; }
    if (params.has('s')) { state.sac = parseInt(params.get('s')); changed = true; }
    if (params.has('v')) { state.tankVolume = parseInt(params.get('v')); changed = true; }

    if (params.has('gf')) {
        state.isGFMode = true;
        if (params.has('gl')) state.currentGFLow = parseInt(params.get('gl'));
        if (params.has('gh')) state.currentGFHigh = parseInt(params.get('gh'));
        changed = true;
    }
    return changed;
}

function loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (applyParams(params)) {
        triggerUpdate();
    }
}

function saveStateToLocalStorage() {
    const stateToSave = { ...state };
    // Theme and Lang are already managed separately but including them for completeness
    localStorage.setItem('divePlannerState', JSON.stringify(stateToSave));
}

function loadStateFromLocalStorage() {
    const saved = localStorage.getItem('divePlannerState');
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        // Explicitly map keys to ensure we only load valid data and maintain types
        const keys = [
            'dive1Depth', 'dive1Time', 'dive2Depth', 'dive2Time',
            'initTankPressure', 'sac', 'tankVolume', 'gazO2pct', 'gazO2pct2',
            'isGFMode', 'currentGFLow', 'currentGFHigh', 'currentGFLow2', 'currentGFHigh2',
            'isGFLow2Locked', 'isGFHigh2Locked', 'surfaceInterval'
        ];
        keys.forEach(key => {
            if (parsed[key] !== undefined) {
                state[key] = parsed[key];
            }
        });
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
    }
}
