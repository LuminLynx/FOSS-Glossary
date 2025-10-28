// FOSS Glossary PWA - Main Application Logic

// Constants
const TERMS_API_URL = '../terms.json';
const FAVORITES_KEY = 'foss-glossary-favorites';
const THEME_KEY = 'foss-glossary-theme';

// State
let allTerms = [];
let filteredTerms = [];
let favorites = new Set();
let currentView = 'all'; // 'all' or 'favorites'
let expandedTerms = new Set();

// DOM Elements
let searchInput;
let termsGrid;
let statsBar;
let themeToggle;
let favoritesToggle;
let toast;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initializeDOM();
  initializeServiceWorker();
  loadTheme();
  loadFavorites();
  loadTerms();
  setupEventListeners();
});

// Initialize DOM references
function initializeDOM() {
  searchInput = document.getElementById('search-input');
  termsGrid = document.getElementById('terms-grid');
  statsBar = document.getElementById('stats-bar');
  themeToggle = document.getElementById('theme-toggle');
  favoritesToggle = document.getElementById('favorites-toggle');
  toast = document.getElementById('toast');
}

// Register Service Worker
function initializeServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
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

// Load terms from API
async function loadTerms() {
  try {
    termsGrid.innerHTML = '<div class="loading">Loading terms</div>';
    
    const response = await fetch(TERMS_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    allTerms = data.terms || [];
    
    filterTerms();
    updateStats();
    renderTerms();
    
  } catch (error) {
    console.error('Error loading terms:', error);
    termsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Failed to load terms</div>
        <div class="empty-state-text">Please check your connection and try again.</div>
      </div>
    `;
  }
}

// Filter terms based on search query and current view
function filterTerms() {
  const query = searchInput.value.toLowerCase().trim();
  
  // First, filter by view (all or favorites)
  let terms = currentView === 'favorites' 
    ? allTerms.filter(term => favorites.has(term.slug))
    : allTerms;
  
  // Then, filter by search query
  if (query) {
    terms = terms.filter(term => {
      const searchText = [
        term.term,
        term.definition,
        term.explanation || '',
        term.humor || '',
        ...(term.tags || [])
      ].join(' ').toLowerCase();
      
      return searchText.includes(query);
    });
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
  // Search input
  searchInput.addEventListener('input', () => {
    filterTerms();
    updateStats();
    renderTerms();
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
    reloadTerms: loadTerms
  };
}
