# OpenHumanSearch 🔍

Search the human web. Get results from Reddit, GitHub, Wikipedia, Hacker News, Stack Overflow, and Archive.org in one place. 

No SEO spam. No ads. No algorithm. Just humans.

**[Try the live demo](https://openhumansearch.io)** *(Replace with your URL)*

![OpenHumanSearch Preview](public/og-image.jpg) *(Add a screenshot here)*

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
By default, the app searches public APIs safely without authentication. However, some APIs (specifically **GitHub**) have strict unauthenticated rate limits (60 requests/hour/IP).

To increase your personal rate limits during development, copy `.env.example` to `.env.local` and add your API keys:

```bash
cp .env.example .env.local
```

*(Note: The current codebase does not yet consume these keys, but the `.env.local` file is set up for future expansion if you wish to run a proxy backend or inject keys into the headers in `src/services/searchApi.js`.)*

## 🚢 Deployment

The project is configured to produce a highly optimized, minified bundle (around 50-60kB gzipped).

```bash
npm run build
# The optimized files will be in the /dist directory
```

It can be deployed to any static host for free:
- [Vercel](https://vercel.com/new)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [GitHub Pages](https://pages.github.com/)

> **Warning for Public Deployments:** Because the app fetches directly from the browser, a public deployment with high traffic will quickly exhaust external rate limits (like GitHub and StackOverflow). For a high-traffic production version, you will need to replace the direct frontend `fetch` calls with a backend proxy that caches responses.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to add new search sources, fix bugs, or improve the UI.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
