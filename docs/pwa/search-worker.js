// Search Worker - Handles fuzzy matching in background thread
// This worker keeps the main thread responsive during search operations

let allTerms = [];

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'INIT':
      // Initialize with terms data
      allTerms = payload.terms || [];
      self.postMessage({ type: 'READY' });
      break;
      
    case 'SEARCH':
      // Perform search
      const { query, favorites, currentView } = payload;
      const results = performSearch(query, favorites, currentView);
      self.postMessage({ 
        type: 'RESULTS', 
        payload: { results, query }
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Perform fuzzy search
function performSearch(query, favorites, currentView) {
  const normalizedQuery = query.toLowerCase().trim();
  
  // First, filter by view (all or favorites)
  let terms = currentView === 'favorites' 
    ? allTerms.filter(term => favorites.includes(term.slug))
    : allTerms;
  
  // If no query, return all terms for current view
  if (!normalizedQuery) {
    return terms;
  }
  
  // Filter by search query with fuzzy matching
  const results = terms.filter(term => {
    const searchText = [
      term.term,
      term.definition,
      term.explanation || '',
      term.humor || '',
      ...(term.tags || [])
    ].join(' ').toLowerCase();
    
    // Simple substring matching (can be enhanced with more sophisticated fuzzy logic)
    return searchText.includes(normalizedQuery);
  });
  
  return results;
}

// Signal that worker is ready
self.postMessage({ type: 'WORKER_LOADED' });
