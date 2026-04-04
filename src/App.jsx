import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './components/LoginScreen';
import LocationList from './components/LocationList';
import VibeCard from './components/VibeCard';
import ReportFlow from './components/ReportFlow';
import KarmaPanel from './components/KarmaPanel';
import NavBar from './components/NavBar';
import { useRealtimeLocations, useRealtimeUserData } from './hooks/useRealtimeLocations';
import { isCollegeOpen } from './data/mockData';
import {
  addUserKarma,
  verifyLocationCrowd,
  incrementHeadingHere,
  updateLocationInFirebase,
} from './utils/firebaseOperations';
import {
  buildKarmaDisplayFromFirebase,
  createGuestKarmaState,
  appendGuestKarma,
  tierForPoints,
  computeBadges,
} from './utils/karmaDisplay';

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

export default function App() {
  const [user, setUser] = useState(null);
  const { locations } = useRealtimeLocations();
  const [localLocations, setLocalLocations] = useState(locations);
  const [guestKarma, setGuestKarma] = useState(() => createGuestKarmaState());
  /** After a write, server total so UI updates even if the listener lags. Cleared when RTDB matches. */
  const [pointsOverride, setPointsOverride] = useState(null);
  const [activityOverride, setActivityOverride] = useState([]);
  const { userData } = useRealtimeUserData(user?.uid);

  useEffect(() => {
    if (!user?.uid || userData == null || pointsOverride == null) return;
    const p = userData.karma?.points ?? userData.karmaPoint;
    if (typeof p === 'number' && p === pointsOverride) {
      setPointsOverride(null);
      setActivityOverride([]);
    }
  }, [user?.uid, userData, pointsOverride]);

  const karma = useMemo(() => {
    // Guest persistence is now handled by createGuestKarmaState/localStorage
    if (!user?.uid) return guestKarma;

    // Use a super-safe fallback to prevent "black screen" during transitions
    const safeFallback = {
      points: pointsOverride ?? 0,
      ...tierForPoints(pointsOverride ?? 0),
      badges: computeBadges(pointsOverride ?? 0, activityOverride || []),
      recentActivity: activityOverride || [],
    };

    if (!userData) return safeFallback;

    try {
      const k = buildKarmaDisplayFromFirebase(userData);
      const displayPoints = pointsOverride != null ? pointsOverride : (k?.points ?? 0);
      const tier = tierForPoints(displayPoints);
      
      // Defensively merge activities
      const firebaseRecent = Array.isArray(k?.recentActivity) ? k.recentActivity : [];
      const overrideRecent = Array.isArray(activityOverride) ? activityOverride : [];
      
      const displayActivity = overrideRecent.length > 0 
        ? [...overrideRecent, ...firebaseRecent].slice(0, 20)
        : firebaseRecent;

      return {
        ...k,
        ...tier,
        points: displayPoints,
        badges: computeBadges(displayPoints, displayActivity),
        recentActivity: displayActivity,
      };
    } catch (e) {
      console.error('Karma calculation Error:', e);
      return safeFallback;
    }
  }, [user?.uid, userData, guestKarma, pointsOverride, activityOverride]);

  const [activeTab, setActiveTab] = useState('map');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLocation = selectedLocationId
    ? localLocations.find((l) => l.id === selectedLocationId) || null
    : null;

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setPointsOverride(null);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setActiveTab('map');
    setSelectedLocationId(null);
    setPointsOverride(null);
    setActivityOverride([]);
    // Note: guestKarma is NOT reset here because the user wants it to persist
  }, []);

  const handleSelectLocation = useCallback((loc) => {
    setSelectedLocationId(loc.id);
  }, []);

  const handleCloseVibeCard = useCallback(() => {
    setSelectedLocationId(null);
  }, []);

  const handleVerify = useCallback(
    async (locationId) => {
      // Find the location name BEFORE async operations to avoid state update delays
      const loc = localLocations.find(l => l.id === locationId);
      const locName = loc?.name || 'location';
      console.log(`Verifying crowd for: ${locName}`);

      setLocalLocations((prev) => {
        return prev.map((locItem) =>
          locItem.id === locationId
            ? { ...locItem, verifications: (locItem.verifications || 0) + 1 }
            : locItem
        );
      });

      if (user?.uid) {
        try {
          const activityLabel = `Confirmed crowd status at ${locName}`;
          const total = await addUserKarma(user.uid, 10, activityLabel);
          if (typeof total === 'number') {
            console.log(`Google Account: Optimistic update to ${total} points`);
            setPointsOverride(total);
            setActivityOverride(prev => [{ action: activityLabel, points: 10, at: Date.now() }, ...prev]);
          }
          await verifyLocationCrowd(locationId);
        } catch (e) {
          console.error('Verify failed:', e);
        }
      } else {
        console.log('Guest Account: Updating local karma');
        setGuestKarma((prev) =>
          appendGuestKarma(prev, 10, `Confirmed crowd status at ${locName}`)
        );
      }

      // Consistent local storage persistence for all account types
      try {
        const stored = localStorage.getItem('queuejump_local_reports');
        const localReports = stored ? JSON.parse(stored) : {};
        localReports[locationId] = {
          verifications: (loc?.verifications || 0) + 1,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem('queuejump_local_reports', JSON.stringify(localReports));
      } catch (e) {
        console.error('Failed to save local reports:', e);
      }
    },
    [user?.uid, localLocations]
  );

  const handleGoingNow = useCallback(
    async (locationId) => {
      const loc = localLocations.find(l => l.id === locationId);
      const locName = loc?.name || 'location';
      console.log(`Marking "Heading Here" for: ${locName}`);

      setLocalLocations((prev) => {
        return prev.map((locItem) =>
          locItem.id === locationId
            ? { ...locItem, headingHereNow: (locItem.headingHereNow || 0) + 1 }
            : locItem
        );
      });

      if (user?.uid) {
        try {
          const activityLabel = `Heading to ${locName}`;
          const total = await addUserKarma(user.uid, 10, activityLabel);
          if (typeof total === 'number') {
            console.log(`Google Account: Optimistic update to ${total} points`);
            setPointsOverride(total);
            setActivityOverride(prev => [{ action: activityLabel, points: 10, at: Date.now() }, ...prev]);
          }
          await incrementHeadingHere(locationId);
        } catch (e) {
          console.error('Heading failed:', e);
        }
      } else {
        console.log('Guest Account: Updating local karma');
        setGuestKarma((prev) =>
          appendGuestKarma(prev, 10, `Heading to ${locName}`)
        );
      }

      // Consistent local storage persistence for all account types
      try {
        const stored = localStorage.getItem('queuejump_local_reports');
        const localReports = stored ? JSON.parse(stored) : {};
        localReports[locationId] = {
          headingHereNow: (loc?.headingHereNow || 0) + 1,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem('queuejump_local_reports', JSON.stringify(localReports));
      } catch (e) {
        console.error('Failed to save local reports:', e);
      }
    },
    [user?.uid, localLocations]
  );

  const handleSubmitReport = useCallback(
    async ({ locationId, waitTime }) => {
      // 1. Validation (Ensures user gives correct data as requested)
      const sanitizedWait = Math.max(0, Math.min(60, Number(waitTime)));
      
      if (!Array.isArray(localLocations)) return;
      const loc = localLocations.find(l => l.id === locationId);
      const locName = loc?.name || 'location';
      const prevReports = loc?.reports ?? 0;
      const timestamp = new Date().toISOString();
      
      console.log(`Submitting wait report: ${sanitizedWait} min for ${locName}`);

      const crowdLevel =
        !isCollegeOpen()
          ? 'closed'
          : sanitizedWait <= 10
            ? 'empty'
            : sanitizedWait <= 25
              ? 'moderate'
              : 'packed';

      // 2. Simple Prediction: Update the trend chart to reflect the NEW report immediately
      const updatedTrend = loc?.trend ? [...loc.trend] : [];
      const currentHour = new Date().getHours();
      const trendIndex = updatedTrend.findIndex(t => {
        const hourStr = t.hour.includes('AM') ? parseInt(t.hour) : parseInt(t.hour) + 12;
        return hourStr === currentHour;
      });
      if (trendIndex !== -1) {
        // Map 0-60 wait time to 0-100 crowd intensity prediction
        updatedTrend[trendIndex].crowd = Math.round((sanitizedWait / 60) * 100);
      }

      setLocalLocations((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((locItem) =>
          locItem.id === locationId
            ? {
                ...locItem,
                currentWait: sanitizedWait,
                crowdLevel,
                reports: (locItem.reports || 0) + 1,
                lastUpdated: timestamp, // Save actual ISO timestamp
                trend: updatedTrend,     // Save updated prediction
              }
            : locItem
        );
      });
      // Removed immediate tab change to manual dismissal of success overlay


      if (user?.uid) {
        try {
          const activityLabel = `Reported ${sanitizedWait} min wait at ${locName}`;
          const total = await addUserKarma(user.uid, 20, activityLabel);
          if (typeof total === 'number') {
            console.log(`Google Account: Optimistic update to ${total} points`);
            setPointsOverride(total);
            setActivityOverride(prev => [{ action: activityLabel, points: 20, at: Date.now() }, ...prev]);
          }
          await updateLocationInFirebase(locationId, {
            currentWait: sanitizedWait,
            crowdLevel,
            reports: (loc?.reports || 0) + 1,
            trend: updatedTrend,
          });
        } catch (e) {
          console.error('Report failed:', e);
        }
      } else {
        console.log('Guest Account: Updating local karma');
        const activityLabel = `Reported ${sanitizedWait} min wait at ${locName}`;
        setGuestKarma((prev) =>
          appendGuestKarma(prev, 20, activityLabel)
        );
      }

      // Consistent local storage persistence for all account types
      try {
        const stored = localStorage.getItem('queuejump_local_reports');
        const localReports = stored ? JSON.parse(stored) : {};
        localReports[locationId] = {
          currentWait: sanitizedWait,
          crowdLevel,
          reports: (loc?.reports || 0) + 1,
          lastUpdated: timestamp,
          trend: updatedTrend,
        };
        localStorage.setItem('queuejump_local_reports', JSON.stringify(localReports));
      } catch (e) {
        console.error('Failed to save local reports:', e);
      }
    },
    [user?.uid, localLocations]
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedLocationId(null);
  }, []);

  useEffect(() => {
    setLocalLocations((prev) => {
      if (!Array.isArray(prev)) return locations;
      
      return locations.map(dbLoc => {
        const localLoc = prev.find(l => l.id === dbLoc.id);
        if (!localLoc) return dbLoc;
        
        // Helper to get raw timestamp
        const getMs = (val) => {
          if (!val) return 0;
          if (val.includes('ago') || val.includes('now')) return Date.now() - 60000; // Mock data is older
          try {
            const d = new Date(val);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          } catch { return 0; }
        };

        const dbTime = getMs(dbLoc.lastUpdated);
        const localTime = getMs(localLoc.lastUpdated);

        // If local update is newer (or database update hasn't reached yet), preserve local
        if (localTime > dbTime) {
          return {
            ...dbLoc,
            currentWait: localLoc.currentWait,
            crowdLevel: localLoc.crowdLevel,
            reports: localLoc.reports,
            trend: localLoc.trend,
            lastUpdated: localLoc.lastUpdated,
            // Keep DB's verifications/headingHere as they might have updated from others
            verifications: Math.max(dbLoc.verifications || 0, localLoc.verifications || 0),
            headingHereNow: Math.max(dbLoc.headingHereNow || 0, localLoc.headingHereNow || 0),
          };
        }
        return dbLoc;
      });
    });
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
