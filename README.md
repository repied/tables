# Tables
A free and open source [Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app) for planning dives using either **French Navy MN90 tables** or **Bühlmann ZHL-16C with Gradient Factors**.

# Usage
- Visit [https://repied.github.io/tables](https://repied.github.io/tables). 
- Toggle between MN90 and GF modes. 
- Set depth, time, surface interval and gases parameters to plan 2 successive dives.

# Installation
Can be installed on mobile/laptop and used offline. Direct installation from the browsers (no PlayStore, no AppStore). 
- **Android/Desktop**: Use the install prompt or "+" icon in the address bar.
- **iOS**: In Safari, tap Share -> "Add to Home Screen".

# References
- Design: [mn•90](https://oliviernemoz.wixsite.com/site/mn90)
- MN90 tables: [eppeplongee](https://eppeplongee.wordpress.com/2018/03/22/tables-mn-90/)
- ZH-L16C parameters: [Wikipedia](https://en.wikipedia.org/wiki/B%C3%BChlmann_decompression_algorithm)
- Co-developped with: [Gemini 3 Pro/Fast](https://blog.google/products-and-platforms/products/gemini/gemini-3/) (~40 millions tokens used)

# Development
- Read [AGENTS.md](./AGENTS.md)
- Use [devcontainer](https://containers.dev/) or GitHub Codespace.
- Start server: `npm run start` (port 5500) or with VScode Live Server extension
- Run tests: `npm test`.
