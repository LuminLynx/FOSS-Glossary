// FOSS Glossary PWA - Main Application Logic

// Constants
const TERMS_API_BASE_URL = '../terms.json';
const FAVORITES_KEY = 'foss-glossary-favorites';
const THEME_KEY = 'foss-glossary-theme';
const VERSION_KEY = 'foss-glossary-version';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const SEARCH_DEBOUNCE_MS = 200; // Debounce delay in milliseconds (150-250ms range)
const FUZZY_MATCH_BONUS_MULTIPLIER = 3.5; // Max score multiplier accounting for bonuses

// State
let allTerms = [];
let filteredTerms = [];
let favorites = new Set();
let currentView = 'all'; // 'all' or 'favorites'
let expandedTerms = new Set();
let termsVersion = null; // Store the version from terms.json
let searchDebounceTimer = null;
let appVersion = '1.0.0'; // Default version
let serviceWorkerRegistration = null;

// DOM Elements
let searchInput;
let termsGrid;
let statsBar;
let themeToggle;
let favoritesToggle;
let toast;
let updateBanner;
let appVersionElement;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initializeDOM();
  initializeServiceWorker();
  loadAppVersion();
  loadTheme();
  loadFavorites();
  loadTerms();
  setupEventListeners();
  setupUpdateNotification();
});

// Initialize DOM references
function initializeDOM() {
  searchInput = document.getElementById('search-input');
  termsGrid = document.getElementById('terms-grid');
  statsBar = document.getElementById('stats-bar');
  themeToggle = document.getElementById('theme-toggle');
  favoritesToggle = document.getElementById('favorites-toggle');
  toast = document.getElementById('toast');
  updateBanner = document.getElementById('update-banner');
  appVersionElement = document.getElementById('app-version');
}

// Register Service Worker
function initializeServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        serviceWorkerRegistration = registration;
        
        // Check for updates on page load
        registration.update();
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and waiting
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    
    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Only reload if we're expecting an update
      if (window.swUpdatePending) {
        window.location.reload();
      }
    });
  }
}

// Load app version from version.json
async function loadAppVersion() {
  try {
    const response = await fetch('./version.json');
    if (response.ok) {
      const versionData = await response.json();
      appVersion = versionData.version;
      
      // Update version display
      if (appVersionElement) {
        appVersionElement.textContent = `v${appVersion}`;
      }
      
      // Check if version has changed
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion && storedVersion !== appVersion) {
        console.log(`App updated from ${storedVersion} to ${appVersion}`);
      }
      
      // Store current version
      localStorage.setItem(VERSION_KEY, appVersion);
    }
  } catch (error) {
    console.error('Error loading version:', error);
  }
}

// Show update notification banner
function showUpdateNotification() {
  if (updateBanner) {
    updateBanner.style.display = 'block';
  }
}

// Setup update notification handlers
function setupUpdateNotification() {
  const reloadBtn = document.getElementById('update-reload-btn');
  const dismissBtn = document.getElementById('update-dismiss-btn');
  
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      // Tell service worker to skip waiting
      if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        window.swUpdatePending = true;
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Force reload if no waiting worker
        window.location.reload();
      }
    });
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      updateBanner.style.display = 'none';
    });
  }
}

// Load theme preference
function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '🌙 Dark';
  } else {
    themeToggle.textContent = '☀️ Light';
  }
}

// Toggle theme
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  themeToggle.textContent = isLight ? '🌙 Dark' : '☀️ Light';
}

// Load favorites from localStorage
function loadFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      favorites = new Set(JSON.parse(saved));
    }
  } catch (error) {
    console.error('Error loading favorites:', error);
    favorites = new Set();
  }
}

// Save favorites to localStorage
function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

// Build terms URL with cache busting
function buildTermsUrl(version = null) {
  // Use version from previous load or timestamp for cache busting
  const ver = version || termsVersion || Date.now();
  return `${TERMS_API_BASE_URL}?ver=${ver}`;
}

// Load terms from API with retry logic
async function loadTerms(retryCount = 0) {
  try {
    termsGrid.innerHTML = '<div class="loading">Loading terms...</div>';
    
    const url = buildTermsUrl();
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format received');
    }
    
    // Store version for cache busting
    if (data.version) {
      termsVersion = data.version;
    }
    
    // Handle empty terms
    allTerms = data.terms || [];
    
    if (allTerms.length === 0) {
      showEmptyState();
      return;
    }
    
    filterTerms();
    updateStats();
    renderTerms();
    
  } catch (error) {
    console.error('Error loading terms:', error);
    
    // Show retry option if we haven't exhausted attempts
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      showErrorStateWithRetry(error, retryCount);
    } else {
      showFinalErrorState(error);
    }
  }
}

// Show empty state when no terms are available
function showEmptyState() {
  termsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-title">No Terms Available</div>
      <div class="empty-state-text">
        The glossary is currently empty. Check back later for new terms!
      </div>
      <button class="retry-btn" onclick="location.reload()">
        🔄 Refresh Page
      </button>
    </div>
  `;
  updateStats();
}

// Show error state with retry button
function showErrorStateWithRetry(error, retryCount) {
  const attemptsLeft = MAX_RETRY_ATTEMPTS - retryCount;
  const errorMessage = getErrorMessage(error);
  
  termsGrid.innerHTML = `
    <div class="empty-state error-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Failed to Load Terms</div>
      <div class="empty-state-text">
        ${errorMessage}
      </div>
      <div class="error-details">
        <p><strong>Attempts remaining:</strong> ${attemptsLeft}</p>
        <p><strong>What you can try:</strong></p>
        <ul class="troubleshooting-list">
          <li>Check your internet connection</li>
          <li>Try refreshing the page</li>
          <li>Clear your browser cache</li>
          <li>Try again in a few moments</li>
        </ul>
      </div>
      <div class="error-actions">
        <button class="retry-btn primary" id="retry-btn">
          🔄 Retry Now (${attemptsLeft} left)
        </button>
        <button class="retry-btn secondary" onclick="location.reload()">
          ↻ Refresh Page
        </button>
      </div>
    </div>
  `;
  
  // Add retry button event listener
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      retryBtn.disabled = true;
      retryBtn.textContent = '⏳ Retrying...';
      
      // Wait before retrying
      setTimeout(() => {
        loadTerms(retryCount + 1);
      }, RETRY_DELAY_MS);
    });
  }
}

// Show final error state after all retries exhausted
function showFinalErrorState(error) {
  const errorMessage = getErrorMessage(error);
  
  termsGrid.innerHTML = `
    <div class="empty-state error-state">
      <div class="empty-state-icon">❌</div>
      <div class="empty-state-title">Unable to Load Terms</div>
      <div class="empty-state-text">
        ${errorMessage}
      </div>
      <div class="error-details">
        <p><strong>All retry attempts exhausted.</strong></p>
        <p><strong>Troubleshooting steps:</strong></p>
        <ul class="troubleshooting-list">
          <li>Verify your internet connection is active</li>
          <li>Check if the site is accessible from another device</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Disable browser extensions that might block requests</li>
          <li>Wait a few minutes and refresh the page</li>
          <li>If the problem persists, the service may be temporarily unavailable</li>
        </ul>
      </div>
      <div class="error-actions">
        <button class="retry-btn primary" onclick="location.reload()">
          ↻ Refresh Page
        </button>
        <button class="retry-btn secondary" onclick="window.fossGlossary.reloadTerms()">
          🔄 Try Again
        </button>
      </div>
      <div class="error-technical">
        <details>
          <summary>Technical Details</summary>
          <pre>${escapeHtml(error.toString())}</pre>
        </details>
      </div>
    </div>
  `;
}

// Get user-friendly error message
function getErrorMessage(error) {
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  
  if (error.message.includes('HTTP 404')) {
    return 'The terms file could not be found. The glossary may be temporarily unavailable.';
  }
  
  if (error.message.includes('HTTP 500') || error.message.includes('HTTP 503')) {
    return 'The server is experiencing issues. Please try again in a few moments.';
  }
  
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return 'Network error occurred. Please check your connection and try again.';
  }
  
  if (error.message.includes('Invalid data format')) {
    return 'Received invalid data from server. The glossary may be updating.';
  }
  
  return 'An unexpected error occurred while loading terms.';
}

/**
 * Calculate fuzzy match score between query and text
 * Returns a score from 0 to 1, where 1 is perfect match
 * Uses character position matching with bonus for consecutive matches
 * @param {string} query - The search query string
 * @param {string} text - The text to search within
 * @returns {number} Match score from 0 to 1
 */
function fuzzyMatch(query, text) {
  if (!query) return 1; // Empty query matches everything
  if (!text) return 0;
  
  query = query.toLowerCase();
  text = text.toLowerCase();
  
  // Exact match gets highest score
  if (text === query) return 1;
  if (text.includes(query)) return 0.9;
  
  let queryIndex = 0;
  let textIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  
  while (queryIndex < query.length && textIndex < text.length) {
    if (query[queryIndex] === text[textIndex]) {
      // Character matches
      score += 1;
      consecutiveMatches++;
      
      // Bonus for consecutive matches (makes sequential matches rank higher)
      if (consecutiveMatches > 1) {
        score += consecutiveMatches * 0.5;
      }
      
      // Bonus for matching at word boundaries
      if (textIndex === 0 || text[textIndex - 1] === ' ' || text[textIndex - 1] === '-') {
        score += 2;
      }
      
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }
  
  // If we didn't match all query characters, it's not a match
  if (queryIndex < query.length) return 0;
  
  // Normalize score based on query length and text length
  // Prefer shorter matches with same score
  const maxPossibleScore = query.length * FUZZY_MATCH_BONUS_MULTIPLIER;
  const normalizedScore = score / maxPossibleScore;
  const lengthPenalty = Math.min(1, query.length / text.length);
  
  return normalizedScore * lengthPenalty;
}

/**
 * Search across multiple fields with fuzzy matching
 * Returns the best match score across all searchable fields
 * @param {Object} term - The term object with properties: term, definition, explanation, humor, aliases, tags
 * @param {string} query - The search query string
 * @returns {number} Best match score across all fields
 */
function fuzzySearchTerm(term, query) {
  if (!query) return 1; // Empty query matches everything
  
  const fields = [
    { text: term.term, weight: 3 },           // Term name is most important
    { text: term.definition, weight: 2 },     // Definition is second
    { text: term.explanation || '', weight: 1.5 },
    { text: term.humor || '', weight: 1 },
    { text: (term.aliases || []).join(' '), weight: 2.5 }, // Aliases are important
    { text: (term.tags || []).join(' '), weight: 1.5 }
  ];
  
  let bestScore = 0;
  
  for (const field of fields) {
    if (field.text) {
      const fieldScore = fuzzyMatch(query, field.text) * field.weight;
      bestScore = Math.max(bestScore, fieldScore);
    }
  }
  
  return bestScore;
}

// Filter terms based on search query and current view
function filterTerms() {
  const query = searchInput.value.toLowerCase().trim();
  
  // First, filter by view (all or favorites)
  let terms = currentView === 'favorites' 
    ? allTerms.filter(term => favorites.has(term.slug))
    : allTerms;
  
  // Then, filter by search query using fuzzy matching
  if (query) {
    // Score each term
    const scoredTerms = terms.map(term => ({
      term,
      score: fuzzySearchTerm(term, query)
    }));
    
    // Filter out terms with no match (score = 0) and sort by score descending
    terms = scoredTerms
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.term);
  }
  
  filteredTerms = terms;
}

// Render terms to the grid
function renderTerms() {
  if (filteredTerms.length === 0) {
    const emptyMessage = currentView === 'favorites'
      ? 'No favorites yet. Star some terms to see them here!'
      : 'No terms found. Try a different search.';
    
    termsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${currentView === 'favorites' ? '⭐' : '🔍'}</div>
        <div class="empty-state-title">${currentView === 'favorites' ? 'No Favorites' : 'No Results'}</div>
        <div class="empty-state-text">${emptyMessage}</div>
      </div>
    `;
    return;
  }
  
  termsGrid.innerHTML = filteredTerms
    .map(term => createTermCard(term))
    .join('');
  
  // Add event listeners to cards
  document.querySelectorAll('.term-card').forEach(card => {
    const slug = card.dataset.slug;
    
    // Toggle expand on card click (but not on buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.term-actions')) {
        toggleExpand(slug);
      }
    });
    
    // Favorite button
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(slug);
    });
    
    // Share button
    const shareBtn = card.querySelector('.share-btn');
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const term = allTerms.find(t => t.slug === slug);
      if (term) {
        showShareModal(term);
      }
    });
  });
}

// Create HTML for a term card
function createTermCard(term) {
  const isFavorite = favorites.has(term.slug);
  const isExpanded = expandedTerms.has(term.slug);
  
  return `
    <div class="term-card ${isExpanded ? 'expanded' : ''}" data-slug="${term.slug}">
      <div class="term-header">
        <h2 class="term-title">${escapeHtml(term.term)}</h2>
        <div class="term-actions">
          <button class="icon-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                  aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                  title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFavorite ? '⭐' : '☆'}
          </button>
          <button class="icon-btn share-btn" 
                  aria-label="Share term"
                  title="Share term">
            📤
          </button>
        </div>
      </div>
      
      <div class="term-definition">${escapeHtml(term.definition)}</div>
      
      ${term.explanation ? `<div class="term-explanation">${escapeHtml(term.explanation)}</div>` : ''}
      
      ${term.humor ? `<div class="term-humor">💡 ${escapeHtml(term.humor)}</div>` : ''}
      
      ${term.tags && term.tags.length > 0 ? `
        <div class="term-tags">
          ${term.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      
      ${term.see_also && term.see_also.length > 0 ? `
        <div class="term-see-also">
          <strong>See also:</strong> ${term.see_also.map(t => escapeHtml(t)).join(', ')}
        </div>
      ` : ''}
    </div>
  `;
}

// Toggle term expanded state
function toggleExpand(slug) {
  if (expandedTerms.has(slug)) {
    expandedTerms.delete(slug);
  } else {
    expandedTerms.add(slug);
  }
  
  const card = document.querySelector(`[data-slug="${slug}"]`);
  if (card) {
    card.classList.toggle('expanded');
  }
}

// Toggle favorite status
function toggleFavorite(slug) {
  if (favorites.has(slug)) {
    favorites.delete(slug);
  } else {
    favorites.add(slug);
  }
  
  saveFavorites();
  updateStats();
  
  // Update the button
  const card = document.querySelector(`[data-slug="${slug}"]`);
  if (card) {
    const btn = card.querySelector('.favorite-btn');
    const isFavorite = favorites.has(slug);
    btn.classList.toggle('active', isFavorite);
    btn.textContent = isFavorite ? '⭐' : '☆';
    btn.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites');
    btn.setAttribute('title', isFavorite ? 'Remove from favorites' : 'Add to favorites');
  }
  
  // If in favorites view and removed, refresh
  if (currentView === 'favorites' && !favorites.has(slug)) {
    filterTerms();
    renderTerms();
  }
}

// Toggle between all terms and favorites view
function toggleFavoritesView() {
  currentView = currentView === 'all' ? 'favorites' : 'all';
  favoritesToggle.textContent = currentView === 'favorites' ? '📖 All Terms' : '⭐ Favorites';
  
  filterTerms();
  renderTerms();
}

// Update statistics
function updateStats() {
  const favCount = favorites.size;
  const totalCount = allTerms.length;
  
  statsBar.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${totalCount}</div>
      <div class="stat-label">Total Terms</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${favCount}</div>
      <div class="stat-label">Favorites</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${filteredTerms.length}</div>
      <div class="stat-label">Showing</div>
    </div>
  `;
}

// Show share modal
function showShareModal(term) {
  const modal = document.getElementById('share-modal');
  const modalText = document.getElementById('share-modal-text');
  
  const shareText = `${term.term}: ${term.definition}`;
  const shareUrl = `${window.location.origin}${window.location.pathname}#${term.slug}`;
  
  modalText.textContent = shareText;
  modal.classList.add('show');
  
  // Set up share buttons
  document.getElementById('share-copy').onclick = () => {
    copyToClipboard(shareUrl, term.term);
    modal.classList.remove('show');
  };
  
  document.getElementById('share-twitter').onclick = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    modal.classList.remove('show');
    showToast('Opening Twitter...');
  };
  
  document.getElementById('share-linkedin').onclick = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=550,height=420');
    modal.classList.remove('show');
    showToast('Opening LinkedIn...');
  };
  
  document.getElementById('share-text').onclick = () => {
    copyToClipboard(shareText, term.term);
    modal.classList.remove('show');
  };
  
  document.getElementById('close-share-modal').onclick = () => {
    modal.classList.remove('show');
  };
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  };
}

// Copy to clipboard
async function copyToClipboard(text, termName) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast(`✓ Copied "${termName}" to clipboard!`);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(`✓ Copied "${termName}" to clipboard!`);
    }
  } catch (error) {
    console.error('Copy failed:', error);
    showToast('❌ Failed to copy to clipboard');
  }
}

// Show toast notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Search input with debouncing
  searchInput.addEventListener('input', () => {
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Set new timer for debounced search
    searchDebounceTimer = setTimeout(() => {
      filterTerms();
      updateStats();
      renderTerms();
    }, SEARCH_DEBOUNCE_MS);
  });
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Favorites toggle
  favoritesToggle.addEventListener('click', toggleFavoritesView);
  
  // Handle deep links (hash navigation)
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange(); // Check on load
}

// Handle hash change for deep linking
function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    // Find and expand the term
    const term = allTerms.find(t => t.slug === hash);
    if (term) {
      expandedTerms.add(hash);
      
      // Scroll to term after a short delay to ensure rendering
      setTimeout(() => {
        const card = document.querySelector(`[data-slug="${hash}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('expanded');
        }
      }, 100);
    }
  }
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
  
  // Escape to clear search or close modal
  if (e.key === 'Escape') {
    const modal = document.getElementById('share-modal');
    if (modal.classList.contains('show')) {
      modal.classList.remove('show');
    } else if (searchInput.value) {
      searchInput.value = '';
      // Clear debounce timer and search immediately
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
      filterTerms();
      updateStats();
      renderTerms();
    }
  }
});

// Expose for debugging
if (typeof window !== 'undefined') {
  window.fossGlossary = {
    allTerms,
    filteredTerms,
    favorites,
    reloadTerms: () => loadTerms(0) // Explicitly start fresh with retry count 0
  };
}
