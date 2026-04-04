import { motion, AnimatePresence } from 'framer-motion';

// Helper to format ISO timestamps into relative strings like "2m ago"
function formatRelativeTime(isoString) {
  if (!isoString) return '2 min ago';
  if (isoString.includes('ago')) return isoString; // Handle legacy mock strings

  try {
    const past = new Date(isoString);
    if (isNaN(past.getTime())) return 'just now';
    
    const diff = Math.floor((new Date() - past) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  } catch {
    return 'just now';
  }
}

export default function LocationList({ locations, filterCategory, searchQuery, onSelectLocation }) {
  // Apply filtering based on category and search query
  const filteredLocations = locations.filter((loc) => {
    const matchesCategory = filterCategory === 'all' || loc.category === filterCategory;
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="location-list-container">
      <AnimatePresence mode="popLayout">
        {filteredLocations.map((loc) => (
          <motion.div
            key={loc.id}
            className="location-card glass"
            onClick={() => onSelectLocation(loc)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            layout
          >
            <div className="loc-card-main">
              <div className="loc-card-header">
                <div className={`loc-icon-wrapper ${loc.crowdLevel || 'empty'}`}>
                  <span className="loc-icon">{loc.icon || '📍'}</span>
                </div>
                <div className="loc-info">
                  <h3>{loc.name || 'Unknown Location'}</h3>
                  <span className="loc-category">
                    {loc.category === 'fest' ? '🎪 Tech Fest' : '🏫 Campus'}
                  </span>
                </div>
              </div>

              <div className="loc-card-status">
                <div className={`loc-wait ${loc.crowdLevel}`}>
                  {loc.crowdLevel === 'closed' ? 'Closed' : `${loc.currentWait}m`}
                </div>
                <div className={`loc-status-label ${loc.crowdLevel || 'empty'}`}>
                  {loc.crowdLevel}
                </div>
              </div>
              <div className="loc-updated-label">
                {formatRelativeTime(loc.lastUpdated)}
              </div>
            </div>

            {/* Inbound Traffic Warning */}
            {loc.headingHereNow > 0 && loc.crowdLevel !== 'closed' && (
              <div className={`loc-surge-indicator ${loc.headingHereNow > 2 ? 'surge' : ''}`}>
                <span className="surge-icon">{loc.headingHereNow > 2 ? '⚠️' : '🏃'}</span>
                <span className="surge-text">
                  {loc.headingHereNow > 2 
                    ? `Surge Alert: ${loc.headingHereNow} people arriving soon` 
                    : `${loc.headingHereNow} heading here now`}
                </span>
              </div>
            )}
          </motion.div>
        ))}

        {filteredLocations.length === 0 && (
          <motion.div 
            className="no-results glass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="no-result-icon">🔍</div>
            <p>No locations found matching your search</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
