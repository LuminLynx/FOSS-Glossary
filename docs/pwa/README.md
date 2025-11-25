# FOSS Glossary - Progressive Web App

A Progressive Web App (PWA) for the FOSS Glossary that works offline, allows users to search terms, save favorites, and share terms with others.

## Features

### 🔍 Offline Search

- Works completely offline after first load
- Real-time search across term names, definitions, explanations, and tags
- Instant filtering with no network delay
- Service Worker caches all 28+ terms locally

### ⭐ Favorites/Bookmarks

- Save favorite terms with a single click
- Favorites persist across sessions using localStorage
- Toggle between "All Terms" and "Favorites" view
- Visual star indicator for favorited terms

### 📤 Share Functionality

- Share individual terms via:
  - Copy link to clipboard
  - Twitter intent
  - LinkedIn sharing
  - Copy term text directly
- Visual toast notifications for all actions
- Deep linking support (terms can be linked directly via #slug)

### 🌓 Dark Mode

- Toggle between dark and light themes
- Theme preference saved to localStorage
- Smooth transitions between themes
- Default dark theme matching the main glossary aesthetic

### 📱 Mobile Responsive

- Optimized for all screen sizes (320px to 1920px+)
- Touch-friendly interface
- Sticky header for easy navigation
- Installable on mobile devices

## Installation

### For Users

#### Desktop (Chrome/Edge)

1. Visit the PWA at `https://luminlynx.github.io/FOSS-Glossary/pwa/`
2. Click the install icon in the address bar (⊕ or +)
3. Click "Install" in the popup

#### Mobile (Chrome/Safari)

1. Visit the PWA on your mobile browser
2. **Android Chrome**: Tap the three-dot menu → "Add to Home screen"
3. **iOS Safari**: Tap the Share button → "Add to Home Screen"

### For Developers

#### Local Development

```bash
# Clone the repository
git clone https://github.com/LuminLynx/FOSS-Glossary.git
cd FOSS-Glossary

# Install dependencies
npm install

# Generate terms.json (required for PWA)
npm run export

# Serve the PWA locally
# Option 1: Using Python
cd docs/pwa
python3 -m http.server 8000

# Option 2: Using Node.js http-server
npx http-server docs/pwa -p 8000

# Open http://localhost:8000 in your browser
```

#### GitHub Pages Deployment

The PWA is automatically deployed to GitHub Pages at:

```
https://luminlynx.github.io/FOSS-Glossary/pwa/
```

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Modern CSS (Grid, Flexbox, CSS Variables)
- **Data Source**: `docs/terms.json` (exported from `terms.yaml`)
- **Service Worker**: For offline caching and PWA functionality
- **Storage**: localStorage for favorites and theme preference
- **No external dependencies** (except generated terms.json)

## File Structure

```
docs/pwa/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest (app metadata + version)
├── service-worker.js       # Offline caching & update detection
├── app.js                  # Main application logic
├── version.json            # Version tracking file
├── styles/
│   └── main.css           # All styles (dark/light modes)
├── assets/
│   ├── logo.png           # App logo
│   └── icons/             # PWA icons
│       ├── icon-192.png   # 192x192 icon
│       └── icon-512.png   # 512x512 icon
└── README.md              # This file
```

## Usage

### Search

- Type in the search bar to filter terms
- Search across term names, definitions, explanations, and tags
- Press `Ctrl+K` (or `Cmd+K` on Mac) to focus search
- Press `Escape` to clear search

### Favorites

- Click the star (☆) icon on any term to favorite it
- Click again to unfavorite (⭐ → ☆)
- Click "⭐ Favorites" button in header to view only favorites
- Click "📖 All Terms" to return to all terms view

### Sharing

- Click the share (📤) icon on any term
- Choose from:
  - **Copy Link**: Copies direct link to term
  - **Twitter**: Opens Twitter share intent
  - **LinkedIn**: Opens LinkedIn share intent
  - **Copy Text**: Copies term name and definition

### Theme Toggle

- Click "☀️ Light" to switch to light mode
- Click "🌙 Dark" to switch to dark mode
- Theme preference is saved automatically

### Expanding Terms

- Click anywhere on a term card (except buttons) to expand/collapse
- Expanded view shows full explanation, humor, and related terms

## PWA Requirements Met

✅ `manifest.json` with app metadata  
✅ Service Worker registered for offline caching  
✅ HTTPS-ready (GitHub Pages)  
✅ Mobile-responsive design (320px to 1920px)  
✅ Dark mode toggle with persistence  
✅ Installable on mobile devices  
✅ Lighthouse PWA score: 90+ (expected)  
✅ Version tracking and update notifications

## Versioning and Updates

### Version Management

The PWA uses a semantic versioning system (e.g., `1.0.0`) to track releases:

- **version.json**: Contains the current app version, build date, and description
- **manifest.json**: Includes version field for app metadata
- **service-worker.js**: Cache names include version for automatic invalidation
- **Footer display**: Shows current version to users (e.g., `v1.0.0`)

### Update Notifications

When a new version is deployed:

1. **Service Worker detects** the new version during update check
2. **Update banner appears** at the top of the page with a rotating icon
3. **User can choose**:
   - Click "Reload" to activate the new version immediately
   - Click "✕" to dismiss and continue with current version
4. **After reload**, the new service worker takes control and updates the app

### How It Works

```javascript
// Service worker checks for updates on page load
registration.update();

// Listens for new service worker installation
registration.addEventListener('updatefound', () => {
  // Shows update notification when new version is waiting
  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
    showUpdateNotification();
  }
});
```

### Update Process for Developers

When releasing a new version:

1. **Update version.json**:

   ```json
   {
     "version": "1.1.0",
     "buildDate": "2025-11-01T12:00:00.000Z",
     "description": "Bug fixes and performance improvements"
   }
   ```

2. **Update manifest.json**:

   ```json
   {
     "version": "1.1.0",
     ...
   }
   ```

3. **Update service-worker.js** (if needed):

   ```javascript
   const APP_VERSION = '1.1.0';
   const CACHE_NAME = `foss-glossary-v${APP_VERSION}`;
   ```

4. **Commit and push** changes to trigger GitHub Pages deployment

5. **Users will automatically see** the update notification on their next visit

### Version Display

The current version is displayed in the footer of every page:

- Format: `v1.0.0`
- Located at: Bottom of page, next to GitHub link
- Style: Monospace font with tag-like appearance
- Clickable: Links to release notes (optional)

### Best Practices

- **Semantic versioning**: Use MAJOR.MINOR.PATCH format
- **Cache busting**: Service worker automatically clears old caches
- **Non-intrusive UX**: Update banner can be dismissed
- **User control**: Users choose when to reload
- **Accessibility**: Update banner uses ARIA alerts for screen readers

## Browser Support

- Chrome/Edge 80+ (full support)
- Firefox 90+ (full support)
- Safari 15+ (full support)
- Mobile browsers (iOS Safari 15+, Chrome Mobile)

## Offline Functionality

The PWA uses a Service Worker to cache:

- All HTML, CSS, and JavaScript files
- PWA manifest and icons
- The terms.json data file
- Logo image

After the first visit, the app works completely offline with all features functional.

## Accessibility

- Semantic HTML5 structure
- ARIA labels on interactive elements
- Keyboard navigation support (Tab, Enter, Escape, Ctrl+K)
- Sufficient color contrast ratios
- Respects `prefers-reduced-motion`
- Screen reader friendly

## Performance

- Minimal bundle size (~25KB combined JS + CSS)
- No external frameworks or libraries
- Service Worker caching for instant loads
- Optimized images (192px and 512px icons)
- CSS Grid and Flexbox for efficient layouts

## Known Limitations

- Requires initial network connection to load terms.json
- Share functionality uses intents (may not work on all platforms)
- Deep linking requires hash-based navigation
- No backend for syncing favorites across devices

## Contributing

Contributions are welcome! Please see the main repository [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) for guidelines.

## License

This project is licensed under CC0 - see the [LICENSE](../LICENSE) file for details.

## Related Links

- [Main FOSS Glossary](https://luminlynx.github.io/FOSS-Glossary/)
- [Repository](https://github.com/LuminLynx/FOSS-Glossary)
- [Terms YAML Source](../terms.yaml)
- [Issue Tracker](https://github.com/LuminLynx/FOSS-Glossary/issues)

## Acknowledgments

Built with ❤️ for the FOSS community by [LuminLynx](https://github.com/LuminLynx).
