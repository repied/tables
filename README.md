# `Tables`
A free and open source [Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app) for planning non-technical dives using either **French Navy MN90 tables** or **Bühlmann ZHL-16C with Gradient Factors**.

[Donations welcomed](https://www.buymeacoffee.com/repied) to support development costs.

# Usage
- Visit [https://repied.github.io/tables](https://repied.github.io/tables). 
- Toggle between MN90 and GF modes. 
- Set depth, time, surface interval and gases parameters to plan 2 successive dives.

# Installation
Can be installed on mobile/laptop/desktop and used offline. Direct installation from the browsers (no PlayStore, no AppStore). 
- **Android/Desktop**: Use the install prompt or "+" icon in the address bar.
- **iOS**: In Safari, tap Share -> "Add to Home Screen".

# References
- Design copied from [mn•90](https://oliviernemoz.wixsite.com/site/mn90)
- MN90 tables: [eppeplongee](https://eppeplongee.wordpress.com/2018/03/22/tables-mn-90/)
- ZH-L16C parameters: [Wikipedia](https://en.wikipedia.org/wiki/B%C3%BChlmann_decompression_algorithm)
- Scaffolding and UX with ~40 millions tokens of [Gemini 3 Pro/Fast](https://blog.google/products-and-platforms/products/gemini/gemini-3/), business logic manually reviewed and improved.

# Development
- Read [AGENTS.md](./AGENTS.md)
- Install dependencies locally `npm install && npx playwright install` or use [devcontainer](https://containers.dev/) or GitHub Codespace.
- Start server: `npm run dev` and http://127.0.0.1:5500 live refreshes.
- Run tests: `npm test`.
