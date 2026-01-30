# Tables
`Tables` is a simple HTML+JS+CSS [PWA](https://en.wikipedia.org/wiki/Progressive_web_app) app to plan dives using French Navy [MN90 tables](https://fr.wikipedia.org/wiki/Tables_de_d%C3%A9compression). 

# MN90 Data source
Tables data is coming from this [excel file](https://eppeplongee.wordpress.com/2018/03/22/tables-mn-90/).

# Usage
Visit https://repied.github.io/tables and choose the dive maximum depth and bottom time by sliding gauges up or down.
TODO: add a successive dive 

Then app returns
. the less conservative safe set of stops.
. the GPS (Groupe de Plongée Successive) number which can be used to compute next dive plan
. The app can also estimate how much pressure will be left in the tank

# Installation on mobiles for offline usage
Users do not go to the App Store or Play Store as the app is a PWA. They simply visit the URL, and the browser handles the rest.

1. Android & Desktop: Modern browsers like Chrome or Edge will actively help to install the app.
- On Android: A small banner often slides up from the bottom saying "Add [App Name] to Home screen." One tap, and it's installed.
- On Desktop: A small "+" icon or "Install" icon appears inside the right side of the URL bar.

2. iPhone, iOS, Safari: Apple is a bit more restrictive. Safari doesn't currently show an automatic "Install" pop-up. Users have to:
- Open your URL in Safari.
- Tap the Share button (the square with an arrow).
- Scroll down and tap "Add to Home Screen."

# Contribution and development
* Open this folder with VS Code (preferably as a [devcontainer](https://containers.dev/)) or in a Github [Codespace](https://github.com/features/codespaces).
* After the devcontainer is ready you can start a local development server with the installed `ms-vscode.live-server` extension, or with `npm run start`.  The application will be available at a local URL, typically `http://127.0.0.1:5500`.
* Playwright test can be run with `npm test`.
