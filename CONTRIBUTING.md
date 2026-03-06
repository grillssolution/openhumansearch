# Contributing to OpenHumanSearch

First off, thank you for considering contributing to OpenHumanSearch! 

## How the App Works
OpenHumanSearch operates primarily as a client-side React SPA. When configured and deployed on Vercel, it uses serverless proxy functions (e.g. `api/reddit.js`) to bypass strict unauthenticated API rate limits, but naturally falls back to direct browser API fetching otherwise. 
When a user types a query, `src/pages/SearchResults.jsx` calls `searchAll()` from `src/services/searchApi.js`. 
That function triggers parallel `fetch` requests (either directly or via the proxy), normalizes their results, scores them for relevance, and interleaves them.

## Adding a New Search Source

Want to add a new site (e.g., DEV.to, Medium, Arxiv)? It's incredibly straightforward!

1. **Add the Source Metadata:**
   Open `src/services/searchApi.js` and add your source to the `SOURCES` object at the top:
   ```javascript
   devto: { name: 'DEV Community', color: '#000000', icon: '👩‍💻' },
   ```

2. **Write the Search Function:**
   Create an `async function searchYourSource(query)` in `searchApi.js`. 
   Use the `fetchWithTimeout()` helper.
   Map the JSON response into the standard OpenHumanSearch Result Object format:
   ```javascript
   return data.map(item => ({
     source: 'devto',           // Matches the key in SOURCES
     title: item.title,
     url: item.url,
     snippet: item.description,
     rawScore: item.public_reactions_count, // For internal sorting
     score: item.public_reactions_count,    
     date: item.published_at,
     meta: { likes: item.public_reactions_count },
     metaText: `${item.public_reactions_count} likes` // What shows in the UI
   }));
   ```

3. **Register the Function:**
   Add your function to the `sourceMap` at the bottom of `searchApi.js`:
   ```javascript
   const sourceMap = {
     reddit: searchReddit,
     // ...
     devto: searchYourSource,
   };
   ```

4. **Update UI Formats (Wait, there's more? No, that's it!)**
   Because the UI in `ResultCard.jsx` dynamically pulls from the `SOURCES` metadata and the `metaText` string you provide, the new source will automatically appear in the filter bar, get proper colors, and render beautifully. 
   *(Optional: If your source has unique metrics like "likes", you can add a custom icon in `formatScore` inside `src/components/ResultCard.jsx`)*.

## Code Style

- We use ESLint. Please run `npm run lint` before opening a pull request.
- Keep components small and functional.
- Ensure the app maintains a minimal backend footprint (only using lightweight serverless API proxies when necessary for higher rate limits).
