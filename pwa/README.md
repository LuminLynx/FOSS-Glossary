# FOSS Glossary PWA

A Progressive Web App (PWA) for the FOSS Glossary that works offline and provides a mobile-friendly experience.

## Features

✅ **Offline Support** - Works without internet connection after initial load
✅ **Favorites Persistence** - Your favorite terms are saved in localStorage
✅ **Deep Linking** - Share direct links to specific terms (e.g., `#code-hoarding`)
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Dark/Light Theme** - Theme preference saved to localStorage
✅ **Search Functionality** - Quickly find terms by name, definition, or tags
✅ **Installable** - Can be installed as a standalone app on mobile devices

## Bug Fixes Implemented

### Bug 1: Favorites Not Persisting After Refresh ✅ FIXED
- **Solution**: Implemented `loadFavorites()` that runs on page load to restore favorites from localStorage
- **Solution**: Implemented `saveFavorites()` that saves favorites to localStorage whenever they change
- **Implementation**: Uses `localStorage.getItem('foss-glossary-favorites')` and `localStorage.setItem()`

### Bug 2: Deep Linking Not Auto-Expanding Terms ✅ FIXED
- **Solution**: Implemented `handleHashChange()` function that:
  - Detects URL hash on page load and hash changes
  - Finds the term element with matching slug
  - Automatically expands the term
  - Scrolls to the term smoothly
  - Adds a highlight animation for better UX
- **Implementation**: Listens for both `DOMContentLoaded` and `hashchange` events

## Usage

### Running Locally

The PWA needs to be served from a web server. You can use any of these methods:

**Python 3:**
```bash
cd pwa
python3 -m http.server 8000
```

Then visit: `http://localhost:8000/`

**Node.js (with npx):**
```bash
cd pwa
npx http-server -p 8000
```

**PHP:**
```bash
cd pwa
php -S localhost:8000
```

### Deep Linking Examples

Share direct links to specific terms:
- `http://localhost:8000/#code-hoarding` - Links to "Code Hoarding" term
- `http://localhost:8000/#rtfm` - Links to "RTFM" term
- `http://localhost:8000/#yak-shaving` - Links to "Yak Shaving" term

The term will automatically expand and scroll into view!

### Adding to Favorites

1. Click the ☆ star icon next to any term
2. The star becomes ⭐ (filled)
3. Your favorites are automatically saved to localStorage
4. Refresh the page - your favorites persist!
5. Click "⭐ Favorites" button to see only your favorite terms

## Files

- `index.html` - Main PWA page with UI structure
- `app.js` - Application logic with bug fixes
- `manifest.json` - PWA manifest for installability
- `service-worker.js` - Offline caching and functionality
- `README.md` - This file

## Technical Details

### LocalStorage Keys Used
- `foss-glossary-favorites` - Array of favorite term slugs
- `foss-glossary-theme` - Current theme ('dark' or 'light')

### Data Source
- Loads terms from `../docs/terms.json`
- Falls back to `./terms.json` if needed

### Browser Compatibility
- Modern browsers with localStorage support
- Service Worker support for offline functionality
- Tested on Chrome, Firefox, Safari, Edge

## Testing

### Test Favorites Persistence:
1. Open the PWA
2. Mark several terms as favorites (click ⭐)
3. Refresh the page (F5 or Ctrl+R)
4. ✅ Verify favorites are still marked with ⭐
5. Click "⭐ Favorites" button
6. ✅ Verify only favorited terms are shown

### Test Deep Linking:
1. Open a new tab/window
2. Paste a deep link like `http://localhost:8000/#code-hoarding`
3. ✅ Verify the page loads and scrolls to the "Code Hoarding" term
4. ✅ Verify the term is automatically expanded
5. ✅ Verify the term has a highlight effect
6. Try other term slugs from terms.json

## Future Enhancements

- Export/import favorites
- Sync favorites across devices
- Share functionality
- More advanced search filters
- Category browsing
- Term contributions from the PWA
