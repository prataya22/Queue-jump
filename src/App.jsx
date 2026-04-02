import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './components/LoginScreen';
import LocationList from './components/LocationList';
import VibeCard from './components/VibeCard';
import ReportFlow from './components/ReportFlow';
import KarmaPanel from './components/KarmaPanel';
import NavBar from './components/NavBar';
import {
  initialLocations,
  initialKarma,
  simulateLiveUpdate,
  applyOperatingHours,
  isCollegeOpen,
} from './data/mockData';

export default function App() {
  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState(() => applyOperatingHours(initialLocations));
  const [karma, setKarma] = useState(initialKarma);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Derive selected location from ID so it always reflects latest data
  const selectedLocation = selectedLocationId
    ? locations.find((l) => l.id === selectedLocationId) || null
    : null;

  // Simulated live updates every 5 seconds (only when logged in)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      setLocations((prev) => simulateLiveUpdate(prev));
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setActiveTab('map');
    setSelectedLocationId(null);
  }, []);

  const handleSelectLocation = useCallback((loc) => {
    setSelectedLocationId(loc.id);
  }, []);

  const handleCloseVibeCard = useCallback(() => {
    setSelectedLocationId(null);
  }, []);

  const handleVerify = useCallback((locationId) => {
    setLocations((prev) => {
      const locName = prev.find((l) => l.id === locationId)?.name || 'location';
      setKarma((prevKarma) => ({
        ...prevKarma,
        points: prevKarma.points + 5,
        recentActivity: [
          { action: `Verified crowd at ${locName}`, points: 5, time: 'just now' },
          ...prevKarma.recentActivity.slice(0, 4),
        ],
      }));
      return prev.map((loc) =>
        loc.id === locationId
          ? { ...loc, verifications: loc.verifications + 1 }
          : loc
      );
    });
  }, []);

  const handleGoingNow = useCallback((locationId) => {
    setLocations((prev) => {
      const locName = prev.find((l) => l.id === locationId)?.name || 'location';
      setKarma((prevKarma) => ({
        ...prevKarma,
        points: prevKarma.points + 5,
        recentActivity: [
          { action: `Heading to ${locName}`, points: 5, time: 'just now' },
          ...prevKarma.recentActivity.slice(0, 4),
        ],
      }));
      return prev.map((loc) =>
        loc.id === locationId
          ? { ...loc, headingHereNow: (loc.headingHereNow || 0) + 1 }
          : loc
      );
    });
  }, []);

  const handleSubmitReport = useCallback(({ locationId, waitTime }) => {
    setLocations((prev) => {
      const locName = prev.find((l) => l.id === locationId)?.name || 'location';
      setKarma((prevKarma) => ({
        ...prevKarma,
        points: prevKarma.points + 10,
        recentActivity: [
          { action: `Reported crowd at ${locName}`, points: 10, time: 'just now' },
          ...prevKarma.recentActivity.slice(0, 4),
        ],
      }));
      return prev.map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              currentWait: waitTime,
              crowdLevel:
                !isCollegeOpen() ? 'closed' :
                waitTime <= 10 ? 'empty' : waitTime <= 25 ? 'moderate' : 'packed',
              reports: loc.reports + 1,
              lastUpdated: 'just now',
            }
          : loc
      );
    });
    setActiveTab('map');
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedLocationId(null);
  }, []);

  // ===== RENDER =====

  if (!user) {
    return (
      <div className="app-container">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">⚡</div>
          <span className="app-logo-text">Queue-Jump</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE
          </div>
          <div
            className="karma-badge"
            onClick={() => handleTabChange('karma')}
          >
            ⚡ <span className="points">{karma.points}</span>
          </div>
          <div className="user-profile">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Filter and Search */}
      {activeTab === 'map' && (
        <div className="discovery-header">
          <div className="search-bar-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-toggle">
            <button
              className={`category-btn ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              All
            </button>
            <button
              className={`category-btn ${filterCategory === 'campus' ? 'active' : ''}`}
              onClick={() => setFilterCategory('campus')}
            >
              Campus
            </button>
            <button
              className={`category-btn ${filterCategory === 'fest' ? 'active' : ''}`}
              onClick={() => setFilterCategory('fest')}
            >
              Tech Fest
            </button>
          </div>
        </div>
      )}

      {/* Options List */}
      {activeTab === 'map' && (
        <div className="location-list-wrapper">
          <LocationList
            locations={locations}
            filterCategory={filterCategory}
            searchQuery={searchQuery}
            onSelectLocation={handleSelectLocation}
          />
        </div>
      )}

      {/* Vibe Card Overlay */}
      <AnimatePresence>
        {selectedLocation && activeTab === 'map' && (
          <VibeCard
            key={selectedLocation.id}
            location={selectedLocation}
            onClose={handleCloseVibeCard}
            onVerify={handleVerify}
            onGoingNow={handleGoingNow}
          />
        )}
      </AnimatePresence>

      {/* Report Flow */}
      <AnimatePresence>
        {activeTab === 'report' && (
          <ReportFlow
            locations={locations}
            onClose={() => handleTabChange('map')}
            onSubmit={handleSubmitReport}
          />
        )}
      </AnimatePresence>

      {/* Karma Panel */}
      <AnimatePresence>
        {activeTab === 'karma' && (
          <KarmaPanel
            karma={karma}
            onClose={() => handleTabChange('map')}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
