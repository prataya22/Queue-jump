import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './components/LoginScreen';
import LocationList from './components/LocationList';
import VibeCard from './components/VibeCard';
import ReportFlow from './components/ReportFlow';
import KarmaPanel from './components/KarmaPanel';
import NavBar from './components/NavBar';
import { useRealtimeLocations, useRealtimeUserData } from './hooks/useRealtimeLocations';
import { initialKarma, isCollegeOpen } from './data/mockData';
import {
  addUserKarma,
  verifyLocationCrowd,
  incrementHeadingHere,
  updateLocationInFirebase,
} from './utils/firebaseOperations';
import {
  buildKarmaDisplayFromFirebase,
  emptyKarmaPlaceholder,
} from './utils/karmaDisplay';

export default function App() {
  const [user, setUser] = useState(null);
  const { locations } = useRealtimeLocations();
  const [localLocations, setLocalLocations] = useState(locations);
  const [guestKarma, setGuestKarma] = useState(initialKarma);
  const { userData } = useRealtimeUserData(user?.uid);

  const karma = useMemo(() => {
    if (!user?.uid) return guestKarma;
    if (!userData) return emptyKarmaPlaceholder();
    return buildKarmaDisplayFromFirebase(userData);
  }, [user?.uid, userData, guestKarma]);

  const [activeTab, setActiveTab] = useState('map');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLocation = selectedLocationId
    ? localLocations.find((l) => l.id === selectedLocationId) || null
    : null;

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

  const handleVerify = useCallback(
    async (locationId) => {
      let locName = 'location';
      setLocalLocations((prev) => {
        const found = prev.find((l) => l.id === locationId);
        locName = found?.name || 'location';
        return prev.map((loc) =>
          loc.id === locationId
            ? { ...loc, verifications: loc.verifications + 1 }
            : loc
        );
      });

      if (user?.uid) {
        try {
          await Promise.all([
            addUserKarma(user.uid, 5, `Verified crowd at ${locName}`),
            verifyLocationCrowd(locationId),
          ]);
        } catch (e) {
          console.error(e);
        }
      } else {
        setGuestKarma((prev) => ({
          ...prev,
          points: prev.points + 5,
          recentActivity: [
            { action: `Verified crowd at ${locName}`, points: 5, at: Date.now() },
            ...prev.recentActivity.slice(0, 4),
          ],
        }));
      }
    },
    [user?.uid]
  );

  const handleGoingNow = useCallback(
    async (locationId) => {
      let locName = 'location';
      setLocalLocations((prev) => {
        const found = prev.find((l) => l.id === locationId);
        locName = found?.name || 'location';
        return prev.map((loc) =>
          loc.id === locationId
            ? { ...loc, headingHereNow: (loc.headingHereNow || 0) + 1 }
            : loc
        );
      });

      if (user?.uid) {
        try {
          await Promise.all([
            addUserKarma(user.uid, 5, `Heading to ${locName}`),
            incrementHeadingHere(locationId),
          ]);
        } catch (e) {
          console.error(e);
        }
      } else {
        setGuestKarma((prev) => ({
          ...prev,
          points: prev.points + 5,
          recentActivity: [
            { action: `Heading to ${locName}`, points: 5, at: Date.now() },
            ...prev.recentActivity.slice(0, 4),
          ],
        }));
      }
    },
    [user?.uid]
  );

  const handleSubmitReport = useCallback(
    async ({ locationId, waitTime }) => {
      let locName = 'location';
      let prevReports = 0;
      const crowdLevel =
        !isCollegeOpen()
          ? 'closed'
          : waitTime <= 10
            ? 'empty'
            : waitTime <= 25
              ? 'moderate'
              : 'packed';

      setLocalLocations((prev) => {
        const loc = prev.find((l) => l.id === locationId);
        locName = loc?.name || 'location';
        prevReports = loc?.reports ?? 0;
        return prev.map((locItem) =>
          locItem.id === locationId
            ? {
                ...locItem,
                currentWait: waitTime,
                crowdLevel,
                reports: (locItem.reports || 0) + 1,
                lastUpdated: 'just now',
              }
            : locItem
        );
      });
      setActiveTab('map');

      if (user?.uid) {
        try {
          await addUserKarma(user.uid, 10, `Reported crowd at ${locName}`);
          await updateLocationInFirebase(locationId, {
            currentWait: waitTime,
            crowdLevel,
            reports: prevReports + 1,
          });
        } catch (e) {
          console.error(e);
        }
      } else {
        setGuestKarma((prev) => ({
          ...prev,
          points: prev.points + 10,
          recentActivity: [
            { action: `Reported crowd at ${locName}`, points: 10, at: Date.now() },
            ...prev.recentActivity.slice(0, 4),
          ],
        }));
      }
    },
    [user?.uid]
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedLocationId(null);
  }, []);

  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  if (!user) {
    return (
      <div className="app-container">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-container">
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
          <button className="logout-btn" onClick={handleLogout} title="Log out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

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

      {activeTab === 'map' && (
        <div className="location-list-wrapper">
          <LocationList
            locations={localLocations}
            filterCategory={filterCategory}
            searchQuery={searchQuery}
            onSelectLocation={handleSelectLocation}
          />
        </div>
      )}

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

      <AnimatePresence>
        {activeTab === 'report' && (
          <ReportFlow
            locations={localLocations}
            onClose={() => handleTabChange('map')}
            onSubmit={handleSubmitReport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === 'karma' && (
          <KarmaPanel
            karma={karma}
            onClose={() => handleTabChange('map')}
          />
        )}
      </AnimatePresence>

      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
