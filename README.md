# OpenHumanSearch 🔍

Search the human web. Get results from Reddit, GitHub, Wikipedia, Hacker News, Stack Overflow, and Archive.org in one place. 

No SEO spam. No ads. No algorithm. Just humans.

**[Try the live demo](https://openhumansearch.com/)**

## ✨ Features

- **Multi-Source Aggregation**: Searches 6 high-signal communities simultaneously.
- **Smart Scoring Engine**: Ranks results based on a composite score of text relevance, freshness, and community metrics (upvotes, stars, points).
- **Source Interleaving**: Prevents one source (e.g., Wikipedia) from dominating the first page of results.
- **Dark/Light Mode**: First-class support for both themes, persistent via `localStorage`.
- **Keyboard Navigation**: Press `/` to focus search anywhere.
- **Privacy First**: Everything runs entirely in your browser. No middleman backend, no tracking, no analytics.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: `react-router-dom`
- **Styling**: Pure CSS (Custom properties for theming, CSS modules ready)
- **Security**: `dompurify` (prevents XSS from raw API snippets)

## 🚀 Getting Started

Because OpenHumanSearch is a pure client-side SPA, you can run it locally with zero backend dependencies.

### Prerequisites
- Node.js (v18 or higher recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/openhumansearch.git
   cd openhumansearch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Environment Variables & Rate Limits

By default, the app searches public APIs safely without authentication. During local development (`npm run dev`), all searches happen directly in the browser.

However, when deployed to **Vercel**, the application automatically utilizes serverless functions (`api/reddit.js` and `api/github.js`) to act as a backend proxy:

1. **Reddit**: Proxies requests with a custom User-Agent, bypassing strict unauthenticated limits to give you ~60 requests/minute.
2. **GitHub**: Securely injects a GitHub Personal Access Token on the backend, increasing the search limit from 60/hour (IP-based) to 30/minute (authenticated).

To enable the authenticated GitHub proxy on Vercel:
1. Generate a [GitHub Personal Access Token](https://github.com/settings/tokens) (read-only is fine).
2. Go to your Vercel Project Settings > Environment Variables.
3. Add a new variable: `GITHUB_TOKEN` (Do **not** prefix with `VITE_` to ensure it stays completely hidden from the browser).

## 🚢 Deployment

The project is configured to produce a highly optimized, minified bundle (around 50-60kB gzipped).

```bash
npm run build
# The optimized files will be in the /dist directory
```

It is primarily designed to be deployed on [Vercel](https://vercel.com/new) out of the box to take advantage of the serverless API proxies for higher rate limits. It includes a `vercel.json` file for proper SPA routing.

> **Note on other hosts:** You can deploy the frontend to any static host (Netlify, Cloudflare Pages, GitHub Pages), but you will lose the backend proxies. The app will automatically fall back to direct browser fetching, which means a high-traffic public deployment will quickly exhaust external IP-based rate limits (like GitHub's 60/hour limit).

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to add new search sources, fix bugs, or improve the UI.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
