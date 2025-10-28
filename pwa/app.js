// FOSS Glossary PWA - Main Application
// Fixes: Favorites persistence & Deep linking auto-expansion

let allTerms = [];
let favorites = new Set();
let currentFilter = 'all'; // 'all' or 'favorites'

// DOM Elements
const termsList = document.getElementById('termsList');
const statsText = document.getElementById('statsText');
const searchBox = document.getElementById('searchBox');
const showAllBtn = document.getElementById('showAllBtn');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const themeToggle = document.getElementById('themeToggle');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadFavorites(); // FIX BUG 1: Load favorites from localStorage on startup
    loadTerms();
    setupEventListeners();
    handleHashChange(); // FIX BUG 2: Handle deep linking on page load
});

// Listen for hash changes (FIX BUG 2)
window.addEventListener('hashchange', handleHashChange);

// Setup event listeners
function setupEventListeners() {
    searchBox.addEventListener('input', handleSearch);
    showAllBtn.addEventListener('click', showAllTerms);
    showFavoritesBtn.addEventListener('click', showFavoritesOnly);
    themeToggle.addEventListener('click', toggleTheme);
}

// FIX BUG 1: Load favorites from localStorage
function loadFavorites() {
    try {
        const stored = localStorage.getItem('foss-glossary-favorites');
        if (stored) {
            const parsed = JSON.parse(stored);
            favorites = new Set(parsed);
            console.log(`Loaded ${favorites.size} favorites from localStorage`);
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = new Set();
    }
}

// FIX BUG 1: Save favorites to localStorage
function saveFavorites() {
    try {
        const favArray = Array.from(favorites);
        localStorage.setItem('foss-glossary-favorites', JSON.stringify(favArray));
        console.log(`Saved ${favorites.size} favorites to localStorage`);
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

// Load theme preference
function loadTheme() {
    const theme = localStorage.getItem('foss-glossary-theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('foss-glossary-theme', theme);
}

// Load terms from JSON
async function loadTerms() {
    try {
        // Try to load from parent directory's terms.json first
        let response = await fetch('../docs/terms.json');
        
        // If that fails, try the current directory
        if (!response.ok) {
            response = await fetch('./terms.json');
        }
        
        // If still failing, try relative to root
        if (!response.ok) {
            response = await fetch('/docs/terms.json');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allTerms = data.terms || [];
        
        updateStats();
        renderTerms(allTerms);
        
        // After rendering, check if we need to handle deep linking
        handleHashChange();
    } catch (error) {
        console.error('Error loading terms:', error);
        termsList.innerHTML = `
            <div class="error">
                <h3>Error Loading Terms</h3>
                <p>${error.message}</p>
                <p>Make sure you're running this from a web server and that terms.json exists.</p>
            </div>
        `;
    }
}

// FIX BUG 2: Handle deep linking with auto-expansion
function handleHashChange() {
    const hash = window.location.hash.slice(1); // Remove the '#'
    
    if (!hash) {
        return; // No hash, nothing to do
    }
    
    console.log(`Deep link detected: #${hash}`);
    
    // Find the term with matching slug
    const termElement = document.querySelector(`[data-slug="${hash}"]`);
    
    if (termElement) {
        // Wait a bit for rendering to complete
        setTimeout(() => {
            // Expand the term
            if (!termElement.classList.contains('expanded')) {
                termElement.classList.add('expanded');
            }
            
            // Scroll to the term smoothly
            termElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add a highlight effect temporarily
            termElement.style.animation = 'highlight 2s ease-out';
            setTimeout(() => {
                termElement.style.animation = '';
            }, 2000);
            
            console.log(`Auto-expanded term: ${hash}`);
        }, 100);
    } else {
        console.warn(`Term not found for hash: ${hash}`);
    }
}

// Update statistics
function updateStats() {
    const totalTerms = allTerms.length;
    const favCount = favorites.size;
    
    if (currentFilter === 'favorites') {
        statsText.textContent = `${favCount} favorite term${favCount !== 1 ? 's' : ''} (${totalTerms} total)`;
    } else {
        statsText.textContent = `${totalTerms} terms • ${favCount} favorite${favCount !== 1 ? 's' : ''}`;
    }
}

// Render terms
function renderTerms(terms) {
    if (terms.length === 0) {
        if (currentFilter === 'favorites') {
            termsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <h3>No favorites yet</h3>
                    <p>Click the star icon on any term to add it to your favorites!</p>
                </div>
            `;
        } else {
            termsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No terms found</h3>
                    <p>Try adjusting your search.</p>
                </div>
            `;
        }
        return;
    }
    
    termsList.innerHTML = terms.map(term => createTermCard(term)).join('');
    
    // Add event listeners to all term cards
    document.querySelectorAll('.term-item').forEach(item => {
        const header = item.querySelector('.term-header');
        const favoriteBtn = item.querySelector('.favorite-btn');
        
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking the favorite button
            if (e.target.closest('.favorite-btn')) {
                return;
            }
            item.classList.toggle('expanded');
        });
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.dataset.slug);
        });
    });
}

// Create term card HTML
function createTermCard(term) {
    const isFavorite = favorites.has(term.slug);
    const favoriteIcon = isFavorite ? '⭐' : '☆';
    const favoriteClass = isFavorite ? 'active' : '';
    
    return `
        <div class="term-item" data-slug="${term.slug}">
            <div class="term-header">
                <div class="term-title">${escapeHtml(term.term)}</div>
                <div class="term-actions">
                    <button class="favorite-btn ${favoriteClass}" aria-label="Toggle favorite">
                        ${favoriteIcon}
                    </button>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="term-content">
                <div class="term-details">
                    <div class="term-definition">
                        <strong>Definition:</strong> ${escapeHtml(term.definition)}
                    </div>
                    
                    ${term.explanation ? `
                        <div class="term-explanation">
                            <strong>Explanation:</strong> ${escapeHtml(term.explanation)}
                        </div>
                    ` : ''}
                    
                    ${term.humor ? `
                        <div class="term-humor">
                            😂 ${escapeHtml(term.humor)}
                        </div>
                    ` : ''}
                    
                    ${term.tags && term.tags.length > 0 ? `
                        <div class="term-tags">
                            ${term.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${term.see_also && term.see_also.length > 0 ? `
                        <div class="see-also">
                            <h4>See Also:</h4>
                            <div class="see-also-links">
                                ${term.see_also.map(ref => 
                                    `<a href="#${slugify(ref)}" class="see-also-link">${escapeHtml(ref)}</a>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Toggle favorite status
function toggleFavorite(slug) {
    if (favorites.has(slug)) {
        favorites.delete(slug);
    } else {
        favorites.add(slug);
    }
    
    // FIX BUG 1: Save to localStorage whenever favorites change
    saveFavorites();
    
    // Update UI
    updateStats();
    
    // If we're in favorites view, re-render
    if (currentFilter === 'favorites') {
        showFavoritesOnly();
    } else {
        // Just update the button for this term
        const termElement = document.querySelector(`[data-slug="${slug}"]`);
        if (termElement) {
            const btn = termElement.querySelector('.favorite-btn');
            const isFavorite = favorites.has(slug);
            btn.textContent = isFavorite ? '⭐' : '☆';
            btn.classList.toggle('active', isFavorite);
        }
    }
}

// Handle search
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    let termsToFilter = currentFilter === 'favorites' 
        ? allTerms.filter(t => favorites.has(t.slug))
        : allTerms;
    
    if (query) {
        termsToFilter = termsToFilter.filter(term => {
            return term.term.toLowerCase().includes(query) ||
                   term.definition.toLowerCase().includes(query) ||
                   (term.explanation && term.explanation.toLowerCase().includes(query)) ||
                   (term.humor && term.humor.toLowerCase().includes(query)) ||
                   (term.tags && term.tags.some(tag => tag.toLowerCase().includes(query)));
        });
    }
    
    renderTerms(termsToFilter);
}

// Show all terms
function showAllTerms() {
    currentFilter = 'all';
    searchBox.value = '';
    showAllBtn.classList.add('btn');
    showAllBtn.classList.remove('btn-secondary');
    showFavoritesBtn.classList.remove('btn');
    showFavoritesBtn.classList.add('btn-secondary');
    updateStats();
    renderTerms(allTerms);
}

// Show favorites only
function showFavoritesOnly() {
    currentFilter = 'favorites';
    searchBox.value = '';
    showFavoritesBtn.classList.add('btn');
    showFavoritesBtn.classList.remove('btn-secondary');
    showAllBtn.classList.remove('btn');
    showAllBtn.classList.add('btn-secondary');
    updateStats();
    
    const favoriteTerms = allTerms.filter(term => favorites.has(term.slug));
    renderTerms(favoriteTerms);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to create slugs from term names
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Add highlight animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0% { 
            box-shadow: 0 0 20px rgba(0, 212, 228, 0.8);
            border-color: var(--primary-color);
        }
        100% { 
            box-shadow: none;
        }
    }
`;
document.head.appendChild(style);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
