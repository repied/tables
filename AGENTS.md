# Coding agents instructions for `tables` 

First read `./README.md` file. Remember that your are most likely developing in a devcontainer.

## Development Skills & Patterns Learned

### 1. Progressive Web App (PWA) Implementation
*   **Manifest Configuration**: Creating `manifest.json` for standalone mobile experience (icons, theme colors, display modes).
*   **Service Worker**: Implementing `sw.js` for offline asset caching and version management (`caches.open`, `event.respondWith`).
*   **Mobile Meta Tags**: Configuring `viewport` for non-scalable mobile interfaces and iOS-specific tags (`apple-mobile-web-app-capable`).

### 2. Vanilla Web Development (No Framework)
*   **Interactive SVG Gauges**:
    *   Using SVG `<path>` with `stroke-dasharray` and `stroke-dashoffset` to create fillable ring gauges.
    *   **Advanced Input Handling**: Implementing a custom gesture system using **Pointer Events API** to distinguish between:
        *   **Drag**: Continuous value adjustment (`pointermove`).
        *   **Single Tap**: Opens a custom DOM-based dropdown for precise selection (debounced).
        *   **Double Tap**: Resets value to default (detected via timestamp deltas).
    *   **Custom UI Controls**: Dynamically creating/removing DOM elements for the value selection dropdown overlay (`document.createElement`, `scrollIntoView`).
*   **State Management & Persistence**: 
    *   Managing app state in global variables with centralized `updateUI()`.
    *   Using `localStorage` to persist user preferences (language) and onboarding state (first-visit modal).
*   **Component Communication**: Exposing internal module data (like Dive Tables) via getter functions on the `window` object to maintain encapsulation while allowing cross-script access.
*   **Glassmorphism & High-Contrast UI**:
    *   Using `backdrop-filter: blur()` and semi-transparent backgrounds.
    *   Implementing "Result Boxes" with dynamic border colors that change based on safety thresholds (e.g., low gas reserve or high ppO2).

### 3. Data Processing & Visualization
*   **MN90 Logic**: Implementing complex lookups (Dive Tables) and algorithms (Air Consumption, DTR) in pure JavaScript.
*   **Bühlmann ZHL-16C**: Implementing Gradient Factors algorithm for custom decompression planning, including residual nitrogen calculation for repetitive dives.
*   **Dynamic Graphing**: Visualizing decompression stops as a depth-proportional vertical chart using CSS heights and Flexbox alignment.
*   **Internationalization (i18n)**: Implementing a custom translation system that handles both text content and HTML-rich segments (like safety disclaimers).

### 4. Testing & Debugging
*   **Live Reload**: Using `npm run dev` (via `live-server`) for real-time UI updates.
*   **Run All Tests**: `npm run test` executes both unit tests (`test:unit`) and E2E tests (`test:e2e`).
*   **Service Worker Cache Bypass**: The `sw.js` is configured to bypass the cache on `localhost`/`127.0.0.1` to ensure `live-server` refreshes show the latest code changes.
*   **Playwright E2E**:
    *   Writing tests to verify UI element visibility and initial state.
    *   Simulating user interactions (mouse drag/move) to test gauge responsiveness.
    *   Capturing browser console errors within tests to ensure application stability.
    *   **Bypassing State**: Using `page.addInitScript` to mock `localStorage` values (like `hasVisited`) to ensure tests start in a clean, predictable state.
*   **Robustness**: Adding null checks for DOM elements to prevent initialization errors.

### 5. Deployments
- **Bump app version:** update `window.APP_VERSION` in `index.html` to force clients to refresh cached assets and the service worker.
- Troubleshooting: to debug or force an update, open DevTools → Application → Service Workers and unregister the service worker, then reload the page.

CI/CD workflows (GitHub Actions):

This repository contains two GitHub Actions workflows for publishing to GitHub Pages:

- `.github/workflows/deploy-main.yml`: runs on pushes to `main`. It executes a `test` job that installs dependencies, installs Playwright browsers, and runs `npm run test` before the `deploy` job publishes the prepared `public` directory to the Pages root (using `destination_dir: .`). This is the guarded, production deploy path.
- `.github/workflows/deploy-insiders.yml`: runs on pushes to `insiders`. It prepares the same `public` directory and publishes to the `insiders` subfolder on GitHub Pages (using `destination_dir: insiders`) but does not run tests first.

Both workflows copy repository files into `public` and use `peaceiris/actions-gh-pages@v3` to publish; `keep_files: true` may leave stale files in Pages if assets are renamed or removed.
