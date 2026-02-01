# Copilot instructions for `tables` 

Look at the ./README.md file fo instruction on how to test.

## Development Skills & Patterns Learned

### 1. Progressive Web App (PWA) Implementation
*   **Manifest Configuration**: Creating `manifest.json` for standalone mobile experience (icons, theme colors, display modes).
*   **Service Worker**: Implementing `sw.js` for offline asset caching and version management (`caches.open`, `event.respondWith`).
*   **Mobile Meta Tags**: Configuring `viewport` for non-scalable mobile interfaces and iOS-specific tags (`apple-mobile-web-app-capable`).

### 2. Vanilla Web Development (No Framework)
*   **Interactive SVG Gauges**:
    *   Using SVG `<path>` with `stroke-dasharray` and `stroke-dashoffset` to create fillable ring gauges.
    *   Implementing custom touch/drag interactions using the **Pointer Events API** (`pointerdown`, `pointermove`, `setPointerCapture`) to control values.
*   **State Management**: Managing app state (depth, time, pressure) in global variables and updating the UI via a centralized `updateUI()` function.
*   **Glassmorphism UI**:
    *   Using `backdrop-filter: blur()` and semi-transparent backgrounds (`rgba`) to create readability on top of background images.
    *   CSS Variables for consistent theming.

### 3. Data Processing & Visualization
*   **MN90 Logic**: Implementing complex lookups (Dive Tables) and algorithms (Air Consumption, DTR) in pure JavaScript.
*   **Dynamic Graphing**: Visualizing decompression stops as a depth-proportional vertical chart using CSS heights and Flexbox alignment.

### 4. Testing & Debugging
*   **Simple browser**: use http://127.0.0.1 instead of http://localhost if you want to check a url
*   **Playwright E2E**:
    *   Writing tests to verify UI element visibility and initial state.
    *   Simulating user interactions (mouse drag/move) to test gauge responsiveness.
    *   Capturing browser console errors within tests to ensure application stability.
*   **Robustness**: Adding null checks for DOM elements to prevent initialization errors.
