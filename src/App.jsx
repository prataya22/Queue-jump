import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import LoginScreen from "./components/LoginScreen";
import LocationList from "./components/LocationList";
import VibeCard from "./components/VibeCard";
import ReportFlow from "./components/ReportFlow";
import KarmaPanel from "./components/KarmaPanel";
import NavBar from "./components/NavBar";
import LoginModal from "./components/LoginModal";
import {
  useRealtimeLocations,
  useRealtimeUserData,
} from "./hooks/useRealtimeLocations";
import { isCollegeOpen } from "./data/mockData";
import {
  addUserKarma,
  verifyLocationCrowd,
  incrementHeadingHere,
  submitReportWithVerification,
  verifyReportAccuracy,
  disputeReport,
} from "./utils/firebaseOperations";
import {
  buildKarmaDisplayFromFirebase,
  createGuestKarmaState,
  appendGuestKarma,
  tierForPoints,
  computeBadges,
} from "./utils/karmaDisplay";

// Helper to format ISO timestamps into relative strings like "2m ago"
function formatRelativeTime(isoString) {
  if (!isoString) return "No data";

  try {
    const past = new Date(isoString);
    if (isNaN(past.getTime())) return "No data";

    const now = new Date();
    const diff = Math.floor((now - past) / 1000);

    if (diff < 0) return "Just now"; // Future timestamp (shouldn't happen)
    if (diff < 30) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch (e) {
    console.error("formatRelativeTime error:", e);
    return "No data";
  }
}

// Helper: Calculate crowd level from weighted average of reports
function calculateWeightedCrowdLevel(location, newWaitTime, timestamp) {
  if (!isCollegeOpen()) return "closed";

  // Get recent reports from localStorage if available
  let recentReports = [];
  try {
    const stored = localStorage.getItem("queuejump_local_reports");
    if (stored) {
      const reports = JSON.parse(stored);
      const locReports = reports[location.id];
      if (locReports && locReports.waitHistory) {
        recentReports = locReports.waitHistory.slice(-10); // Last 10 reports
      }
    }
  } catch (e) {
    console.log("Could not load report history");
  }

  // Add current report to the pool
  const currentTime = new Date(timestamp).getTime();
  const reportsWithWeights = recentReports
    .map((report) => ({
      wait: report.wait,
      timestamp: new Date(report.timestamp).getTime(),
      weight: 1,
    }))
    .concat([{ wait: newWaitTime, timestamp: currentTime, weight: 1 }])
    .filter((r) => !isNaN(r.wait) && r.wait >= 0)
    .slice(-15); // Keep last 15 reports max

  if (reportsWithWeights.length === 0) {
    // Fallback to single value
    return newWaitTime <= 10
      ? "empty"
      : newWaitTime <= 25
        ? "moderate"
        : "packed";
  }

  // Calculate recency-weighted average
  const now = currentTime;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  let totalWeight = 0;
  let weightedSum = 0;

  reportsWithWeights.forEach((report) => {
    // Recent reports (last 5 min) get weight 1.0
    // Older reports get exponentially lower weights
    const age = now - report.timestamp;
    const recencyWeight =
      age < 5 * 60 * 1000 ? 1.0 : Math.max(0.1, 1.0 - age / (30 * 60 * 1000)); // Decays over 30 minutes

    totalWeight += recencyWeight;
    weightedSum += report.wait * recencyWeight;
  });

  const weightedAverage =
    totalWeight > 0 ? weightedSum / totalWeight : newWaitTime;

  console.log(
    `Weighted avg wait time: ${weightedAverage.toFixed(1)} min (from ${reportsWithWeights.length} reports)`,
  );

  // Determine crowd level from weighted average
  if (weightedAverage <= 10) return "empty";
  if (weightedAverage <= 25) return "moderate";
  return "packed";
}

export default function App() {
  const [user, setUser] = useState(null);
  const { locations } = useRealtimeLocations();
  const [localLocations, setLocalLocations] = useState(locations);
  const [guestKarma, setGuestKarma] = useState(() => createGuestKarmaState());
  /** After a write, server total so UI updates even if the listener lags. Cleared when RTDB matches. */
  const [pointsOverride, setPointsOverride] = useState(null);
  const [activityOverride, setActivityOverride] = useState(() => {
    try {
      const saved = localStorage.getItem("queuejump_activity_override");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persistActivityOverride = useCallback((updater) => {
    setActivityOverride((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(
          "queuejump_activity_override",
          JSON.stringify(next),
        );
      } catch {}
      return next;
    });
  }, []);

  const [verificationPending, setVerificationPending] = useState({});
  const { userData } = useRealtimeUserData(user?.uid);

  const prevPointsRef = useRef(null);

  useEffect(() => {
    if (!user?.uid || userData == null) return;
    const p = userData.karma?.points ?? userData.karmaPoint ?? 0;

    // Detect when Firebase karma increases (auto-verify awarded karma)
    if (prevPointsRef.current !== null && p !== prevPointsRef.current) {
      console.log(`✅ Karma changed! Clearing pending panel`);
      persistActivityOverride((prev) =>
        prev.map((item) =>
          item.status === "pending"
            ? {
                ...item,
                status: p > prevPointsRef.current ? "confirmed" : "disputed",
              }
            : item,
        ),
      );
      setTimeout(() => {
        persistActivityOverride([]);
        localStorage.removeItem("queuejump_activity_override");
      }, 3000);
    }
    prevPointsRef.current = p;

    if (
      pointsOverride != null &&
      typeof p === "number" &&
      p === pointsOverride
    ) {
      setPointsOverride(null);
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
      const displayPoints =
        pointsOverride != null
          ? pointsOverride
          : (k?.points ?? userData?.karmaPoint ?? 0);
      const tier = tierForPoints(displayPoints);

      // Defensively merge activities
      const firebaseRecent = Array.isArray(k?.recentActivity)
        ? k.recentActivity
        : [];
      const overrideRecent = Array.isArray(activityOverride)
        ? activityOverride
        : [];

      const displayActivity =
        overrideRecent.length > 0
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
      console.error("Karma calculation Error:", e);
      return safeFallback;
    }
  }, [user?.uid, userData, guestKarma, pointsOverride, activityOverride]);

  const [activeTab, setActiveTab] = useState("map");
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const selectedLocation = selectedLocationId
    ? localLocations.find((l) => l.id === selectedLocationId) || null
    : null;

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setPointsOverride(null);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setActiveTab("map");
    setSelectedLocationId(null);
    setPointsOverride(null);
    // Preserve activityOverride to keep pending reports visible after logout
    // Only clear guest karma on logout
    try {
      localStorage.removeItem("queuejump_guest_karma");
    } catch (e) {
      console.error("Failed to clear guest karma from storage:", e);
    }
    setGuestKarma(createGuestKarmaState());
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
      const loc = localLocations.find((l) => l.id === locationId);
      const locName = loc?.name || "location";
      console.log(`Verifying crowd for: ${locName}`);

      setLocalLocations((prev) => {
        return prev.map((locItem) =>
          locItem.id === locationId
            ? { ...locItem, verifications: (locItem.verifications || 0) + 1 }
            : locItem,
        );
      });

      if (user?.uid) {
        try {
          const activityLabel = `Confirmed crowd status at ${locName}`;
          const total = await addUserKarma(user.uid, 10, activityLabel);
          if (typeof total === "number") {
            console.log(`Google Account: Optimistic update to ${total} points`);
            setPointsOverride(total);
            persistActivityOverride((prev) => [
              { action: activityLabel, points: 10, at: Date.now() },
              ...prev,
            ]);
          }
          await verifyLocationCrowd(locationId);
        } catch (e) {
          console.error("Verify failed:", e);
        }
      } else {
        console.log("Guest Account: Updating local karma");
        setGuestKarma((prev) =>
          appendGuestKarma(prev, 10, `Confirmed crowd status at ${locName}`),
        );
      }

      // Consistent local storage persistence for all account types
      try {
        const stored = localStorage.getItem("queuejump_local_reports");
        const localReports = stored ? JSON.parse(stored) : {};
        localReports[locationId] = {
          verifications: (loc?.verifications || 0) + 1,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(
          "queuejump_local_reports",
          JSON.stringify(localReports),
        );
      } catch (e) {
        console.error("Failed to save local reports:", e);
      }
    },
    [user?.uid, localLocations],
  );

  const handleGoingNow = useCallback(
    async (locationId) => {
      const loc = localLocations.find((l) => l.id === locationId);
      const locName = loc?.name || "location";
      console.log(`Marking "Heading Here" for: ${locName}`);

      setLocalLocations((prev) => {
        return prev.map((locItem) =>
          locItem.id === locationId
            ? { ...locItem, headingHereNow: (locItem.headingHereNow || 0) + 1 }
            : locItem,
        );
      });

      if (user?.uid) {
        try {
          const activityLabel = `Heading to ${locName}`;
          const total = await addUserKarma(user.uid, 10, activityLabel);
          if (typeof total === "number") {
            console.log(`Google Account: Optimistic update to ${total} points`);
            setPointsOverride(total);
            persistActivityOverride((prev) => [
              { action: activityLabel, points: 10, at: Date.now() },
              ...prev,
            ]);
          }
          await incrementHeadingHere(locationId);
        } catch (e) {
          console.error("Heading failed:", e);
        }
      } else {
        console.log("Guest Account: Updating local karma");
        setGuestKarma((prev) =>
          appendGuestKarma(prev, 10, `Heading to ${locName}`),
        );
      }

      // Consistent local storage persistence for all account types
      try {
        const stored = localStorage.getItem("queuejump_local_reports");
        const localReports = stored ? JSON.parse(stored) : {};
        localReports[locationId] = {
          headingHereNow: (loc?.headingHereNow || 0) + 1,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(
          "queuejump_local_reports",
          JSON.stringify(localReports),
        );
      } catch (e) {
        console.error("Failed to save local reports:", e);
      }
    },
    [user?.uid, localLocations],
  );

  const handleSubmitReport = useCallback(
    async ({ locationId, waitTime }) => {
      // Only authorized users can submit reports
      if (!user?.uid) {
        console.log("Report submission denied: Guest account");
        return;
      }

      const sanitizedWait = Math.max(0, Math.min(30, Number(waitTime)));

      if (!Array.isArray(localLocations)) {
        console.error("❌ localLocations is not an array:", localLocations);
        return;
      }

      const loc = localLocations.find((l) => l.id === locationId);
      console.log("🔍 Report Debug:", {
        locationId,
        foundLocation: loc?.name || "NOT FOUND",
        sanitizedWait,
        allLocations: localLocations.map((l) => ({ id: l.id, name: l.name })),
      });

      if (!loc) {
        console.error("❌ Location not found:", locationId);
        return;
      }

      const locName = loc?.name || "location";
      const timestamp = new Date().toISOString();

      console.log(
        `✅ Submitting wait report: ${sanitizedWait} min for ${locName}`,
      );

      // Calculate crowd level using weighted average of reports
      const crowdLevel = calculateWeightedCrowdLevel(
        loc,
        sanitizedWait,
        timestamp,
      );

      // Calculate updated trend - create deep copies of trend objects
      const updatedTrend = loc?.trend
        ? loc.trend.map((t) => ({ ...t })) // Deep copy each trend object
        : [];
      const currentHour = new Date().getHours();
      const trendIndex = updatedTrend.findIndex((t) => {
        const hourStr = t.hour.includes("AM")
          ? parseInt(t.hour)
          : parseInt(t.hour) + 12;
        return hourStr === currentHour;
      });
      if (trendIndex !== -1) {
        updatedTrend[trendIndex] = {
          ...updatedTrend[trendIndex],
          crowd: Math.round((sanitizedWait / 30) * 100),
        };
      }

      try {
        const activityLabel = `Reported ${sanitizedWait} min wait at ${locName}`;
        const reportId = `${locationId}-${timestamp}`;

        // Show pending karma in activity - waiting for verification
        persistActivityOverride((prev) => [
          {
            action: activityLabel,
            points: 20,
            at: Date.now(),
            status: "pending",
            reportId: reportId,
          },
          ...prev,
        ]);

        // Track this report as pending verification
        setVerificationPending((prev) => ({
          ...prev,
          [reportId]: {
            locationId,
            activityLabel,
            submittedAt: Date.now(),
          },
        }));

        // Submit report — wait time will only go live after 2 other users verify it
        await submitReportWithVerification(
          locationId,
          user.uid,
          sanitizedWait,
          timestamp,
        );

        // ✅ REMOVED: updateLocationInFirebase call — no longer updates wait time instantly
        // Wait time now only updates inside verifyReportAccuracy once threshold is met

        console.log(
          `⏳ Report submitted. Waiting for 2 verifications before going live.`,
        );
      } catch (e) {
        console.error("Report failed:", e);

        // Keep as pending (show pending instead of failed)
        persistActivityOverride((prev) =>
          prev.map((item) =>
            item.action?.includes(locName)
              ? { ...item, status: "pending" }
              : item,
          ),
        );
      }
    },
    [user?.uid, localLocations],
  );

  const handleVerifyReport = useCallback(
    async (locationId, reporterId) => {
      if (!user?.uid) {
        console.log("Verification denied: Guest account");
        return;
      }

      if (user.uid === reporterId) {
        console.log("Cannot verify your own report");
        return;
      }

      try {
        const verified = await verifyReportAccuracy(locationId, user.uid);

        if (verified) {
          // Report now has enough verifications! Award karma to the reporter
          const locationName =
            localLocations.find((l) => l.id === locationId)?.name || "location";
          const activityLabel = `Crowd report verified at ${locationName}`;

          // Update pending status to confirmed in activity
          persistActivityOverride((prev) =>
            prev.map((item) => {
              // Find the corresponding pending report and update it
              if (
                item.status === "pending" &&
                item.action?.includes(
                  localLocations.find((l) => l.id === locationId)?.name ||
                    "location",
                )
              ) {
                return { ...item, status: "confirmed" };
              }
              return item;
            }),
          );

          // Safety: Clear confirmed items after 3 seconds even if points update is slow
          setTimeout(() => {
            persistActivityOverride((prev) =>
              prev.filter((item) => item.status !== "confirmed"),
            );
          }, 3500);

          // Clear verification pending status
          setVerificationPending((prev) => {
            const updated = { ...prev };
            // Find and remove all reports verified for this location
            Object.keys(updated).forEach((key) => {
              if (updated[key].locationId === locationId) {
                delete updated[key];
              }
            });
            return updated;
          });
        }
      } catch (e) {
        console.error("Verification failed:", e);
      }
    },
    [user?.uid, localLocations, verificationPending],
  );
  const handleDisputeReport = useCallback(
    async (locationId, reporterId) => {
      if (!user?.uid) return;
      if (user.uid === reporterId) return;
      try {
        await disputeReport(locationId, user.uid);
      } catch (e) {
        console.error("Dispute failed:", e);
      }
    },
    [user?.uid],
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE
          </div>
          <div className="karma-badge" onClick={() => handleTabChange("karma")}>
            ⚡ <span className="points">{karma.points}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log out">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {activeTab === "map" && (
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
              className={`category-btn ${filterCategory === "all" ? "active" : ""}`}
              onClick={() => setFilterCategory("all")}
            >
              All
            </button>
            <button
              className={`category-btn ${filterCategory === "campus" ? "active" : ""}`}
              onClick={() => setFilterCategory("campus")}
            >
              Campus
            </button>
            <button
              className={`category-btn ${filterCategory === "fest" ? "active" : ""}`}
              onClick={() => setFilterCategory("fest")}
            >
              Tech Fest
            </button>
          </div>
        </div>
      )}

      {activeTab === "map" && (
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
        {selectedLocation && activeTab === "map" && (
          <VibeCard
            key={selectedLocation.id}
            location={selectedLocation}
            onClose={handleCloseVibeCard}
            onVerify={handleVerify}
            onGoingNow={handleGoingNow}
            onVerifyReport={handleVerifyReport}
            onDisputeReport={handleDisputeReport}
            currentUserId={user?.uid}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === "report" && (
          <ReportFlow
            locations={localLocations}
            onClose={() => handleTabChange("map")}
            onSubmit={handleSubmitReport}
            isAuthorized={!!user?.uid}
            onLoginClick={() => {
              setShowLoginModal(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === "karma" && (
          <KarmaPanel karma={karma} onClose={() => handleTabChange("map")} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(userData) => {
              setShowLoginModal(false);
              handleLogin(userData);
              handleTabChange("report");
            }}
          />
        )}
      </AnimatePresence>

      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
