import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CROWD_COLORS, CROWD_LABELS } from "../data/mockData";

// Helper to format ISO timestamps into relative strings like "2m ago"
function formatRelativeTime(isoString) {
  if (!isoString) return "2 min ago";
  if (isoString.includes("ago")) return isoString;

  try {
    const past = new Date(isoString);
    if (isNaN(past.getTime())) return "just now";

    const diff = Math.floor((new Date() - past) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  } catch {
    return "just now";
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(20, 20, 20, 0.95)",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          borderRadius: "8px",
          padding: "8px 12px",
          backdropFilter: "blur(8px)",
        }}
      >
        <p style={{ color: "#00E5FF", fontSize: "12px", fontWeight: 700 }}>
          {label}
        </p>
        <p style={{ color: "#F0F0F0", fontSize: "11px", fontWeight: 500 }}>
          Crowd Level: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

// Helper: Find best time ranges (periods with less crowding)
function findBestTimeWindows(trend) {
  if (!trend || !Array.isArray(trend) || trend.length === 0) {
    return [];
  }

  // Calculate average crowd level
  const crowdLevels = trend.map((t) => t.crowd || 0);
  const avgLevel = crowdLevels.reduce((a, b) => a + b, 0) / crowdLevels.length;

  // Find windows 30% below average (less crowded periods)
  const threshold = avgLevel * 0.7;
  let windows = [];
  let currentWindow = null;

  trend.forEach((item, idx) => {
    if (item.crowd <= threshold) {
      if (!currentWindow) {
        currentWindow = { start: item.hour, startIdx: idx, hours: 1 };
      } else {
        currentWindow.hours += 1;
      }
    } else {
      if (currentWindow && currentWindow.hours >= 1) {
        currentWindow.end = trend[idx - 1].hour;
        windows.push(currentWindow);
      }
      currentWindow = null;
    }
  });

  if (currentWindow && currentWindow.hours >= 1) {
    currentWindow.end = trend[trend.length - 1].hour;
    windows.push(currentWindow);
  }

  return windows.slice(0, 3); // Return top 3 best windows
}

// Helper: Format time range in smart way
function formatTimeRange(startHour, endHour) {
  const formatHour = (h) => {
    if (typeof h === "string") {
      return h; // Already formatted like "2:00PM"
    }
    const hour = parseInt(h);
    if (hour < 12) return `${hour}:00AM`;
    if (hour === 12) return "12:00PM";
    return `${hour - 12}:00PM`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

export default function VibeCard({
  location,
  onClose,
  onVerify,
  onGoingNow,
  onVerifyReport,
  onDisputeReport,
  currentUserId,
}) {
  const reportKey = `${currentUserId}_${location.id}_${location.latestReport?.createdAt ?? "none"}`;

  const [verified, setVerified] = useState(false);
  const [going, setGoing] = useState(false);

  const [reportVerified, setReportVerified] = useState(() => {
    try {
      const saved = localStorage.getItem(`verified_${reportKey}`);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [reportDisputed, setReportDisputed] = useState(() => {
    try {
      const saved = localStorage.getItem(`disputed_${reportKey}`);
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [pendingAction, setPendingAction] = useState(null);

  // Success Overlay States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");

  const color = CROWD_COLORS[location.crowdLevel] || "#666";
  const label = CROWD_LABELS[location.crowdLevel] || "Unknown";

  const confirmVerify = () => {
    onVerify(location.id);
    setVerified(true);
    setSuccessTitle("Verification Successful!");
    setShowSuccess(true);
  };

  const confirmGoingNow = () => {
    onGoingNow(location.id);
    setGoing(true);
    setSuccessTitle("Heading Logged!");
    setShowSuccess(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction === "verify") {
      confirmVerify();
    } else if (pendingAction === "heading") {
      confirmGoingNow();
    }
    setPendingAction(null);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose();
  };

  return (
    <>
      <motion.div
        className="vibe-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="vibe-card glass-strong"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={`vibe-card-glow ${location.crowdLevel}`} />

          <div className="vibe-header">
            <div className="vibe-title">
              <span className="vibe-title-icon">{location.icon}</span>
              <div className="vibe-title-text">
                <h2>{location.name}</h2>
                <span className="category-label">
                  {location.category === "fest" ? "🎪 Tech Fest" : "🏫 Campus"}
                </span>
              </div>
            </div>
            <button className="vibe-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="current-vibe glass">
            <div className={`vibe-status-dot ${location.crowdLevel}`} />
            <div>
              {location.crowdLevel === "closed" ? (
                <div className="vibe-wait-time closed">Closed</div>
              ) : (
                <>
                  <div className={`vibe-wait-time ${location.crowdLevel}`}>
                    {location.currentWait ?? 0}
                  </div>
                  <div className="vibe-wait-label">
                    {location.currentWait > 0 ? "min wait" : "No wait!"}
                  </div>
                </>
              )}
            </div>
            <div className={`vibe-crowd-label ${location.crowdLevel}`}>
              {label}
            </div>
          </div>

          {/* Surge Warning - High visitor count */}
          {location.headingHereNow >= 5 && location.crowdLevel !== "closed" && (
            <motion.div
              className="surge-warning"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(255, 45, 85, 0.15)",
                borderLeft: "3px solid #FF2D55",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "12px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#FF2D55",
                  }}
                >
                  Incoming Crowd Surge
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 45, 85, 0.8)",
                    marginTop: "2px",
                  }}
                >
                  {location.headingHereNow} people are planning to visit soon
                </div>
              </div>
            </motion.div>
          )}

          {/* Best Time to Visit - Smart time ranges */}
          {location.trend &&
            Array.isArray(location.trend) &&
            location.trend.length > 0 &&
            (() => {
              const bestWindows = findBestTimeWindows(location.trend);
              return bestWindows.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(0, 255, 136, 0.1)",
                    borderLeft: "3px solid #00FF88",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#00FF88",
                      marginBottom: "8px",
                    }}
                  >
                    💡 Optimal Visit Times
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {bestWindows.map((window, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "11px",
                          color: "rgba(0, 255, 136, 0.9)",
                          background: "rgba(0, 255, 136, 0.05)",
                          padding: "6px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {formatTimeRange(window.start, window.end)}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null;
            })()}

          {/* Report Verification Section */}
          {location.latestReport &&
            !location.latestReport.invalidated &&
            !location.latestReport.verified && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1))",
                  borderLeft: "3px solid #3B82F6",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#3B82F6",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🔍 <span>Report Under Review</span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(59, 130, 246, 0.9)",
                    marginBottom: "8px",
                  }}
                >
                  Wait time reported:{" "}
                  <span style={{ fontWeight: 600 }}>
                    {location.latestReport.waitTime || 0} min
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(59, 130, 246, 0.7)",
                    marginBottom: "10px",
                  }}
                >
                  Verifications:{" "}
                  <span style={{ fontWeight: 600 }}>
                    {location.latestReport.verificationCount || 0} / 2
                  </span>
                </div>
                {currentUserId &&
                  currentUserId !== location.latestReport.reporterId && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <motion.button
                        onClick={() => {
                          onVerifyReport(
                            location.id,
                            location.latestReport.reporterId,
                          );
                          setReportVerified(true);
                          try {
                            localStorage.setItem(
                              `verified_${reportKey}`,
                              "true",
                            );
                          } catch {}
                        }}
                        disabled={reportVerified || reportDisputed}
                        style={{
                          flex: 1,
                          padding: "8px",
                          background: reportVerified
                            ? "rgba(0, 255, 136, 0.2)"
                            : reportDisputed
                              ? "rgba(59, 130, 246, 0.1)"
                              : "#3B82F6",
                          border: "none",
                          borderRadius: "6px",
                          color: reportVerified
                            ? "#00FF88"
                            : reportDisputed
                              ? "rgba(255,255,255,0.3)"
                              : "#FFF",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor:
                            reportVerified || reportDisputed
                              ? "default"
                              : "pointer",
                          opacity: reportVerified || reportDisputed ? 0.5 : 1,
                        }}
                        whileHover={!reportVerified ? { scale: 1.05 } : {}}
                        whileTap={!reportVerified ? { scale: 0.95 } : {}}
                      >
                        {reportVerified ? "✅ You Verified" : "👍 Looks Right"}
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          if (!reportDisputed) {
                            onDisputeReport(
                              location.id,
                              location.latestReport.reporterId,
                            );
                            setReportDisputed(true);
                            try {
                              localStorage.setItem(
                                `disputed_${reportKey}`,
                                "true",
                              );
                            } catch {}
                          }
                        }}
                        disabled={reportDisputed || reportVerified}
                        style={{
                          flex: 1,
                          padding: "8px",
                          background: reportDisputed
                            ? "rgba(255, 45, 85, 0.2)"
                            : "rgba(255, 45, 85, 0.15)",
                          border: "1px solid rgba(255, 45, 85, 0.4)",
                          borderRadius: "6px",
                          color: reportDisputed
                            ? "rgba(255, 45, 85, 0.9)"
                            : reportVerified
                              ? "rgba(255, 45, 85, 0.3)"
                              : "#FF2D55",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor:
                            reportDisputed || reportVerified
                              ? "default"
                              : "pointer",
                          opacity: reportVerified ? 0.5 : 1,
                        }}
                        whileHover={!reportVerified ? { scale: 1.05 } : {}}
                        whileTap={!reportVerified ? { scale: 0.95 } : {}}
                      >
                        {reportDisputed ? "⚠️ Disputed" : "❌ Wrong"}
                      </motion.button>
                    </div>
                  )}

                {/* Reporter sees pending message instead of buttons */}
                {currentUserId &&
                  currentUserId === location.latestReport.reporterId && (
                    <div
                      style={{
                        padding: "8px",
                        background: "rgba(59, 130, 246, 0.1)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "rgba(59, 130, 246, 0.8)",
                        textAlign: "center",
                      }}
                    >
                      ⏳ Waiting for others to verify your report...
                    </div>
                  )}
              </motion.div>
            )}

          <div className="vibe-stats">
            <div className="vibe-stat">
              <div className="vibe-stat-value">{location.reports || 0}</div>
              <div className="vibe-stat-label">Reports</div>
            </div>
            <div className="vibe-stat">
              <div className="vibe-stat-value">
                {formatRelativeTime(location.lastUpdated)}
              </div>
              <div className="vibe-stat-label">Updated</div>
            </div>
            <div className="vibe-stat">
              <div className="vibe-stat-value">{location.accuracy || 80}%</div>
              <div className="vibe-stat-label">Accuracy</div>
            </div>
          </div>

          <div className="vibe-trend">
            <div className="vibe-trend-title">📊 Busy Hours Today</div>
            <div className="trend-chart-container">
              {location.trend &&
              Array.isArray(location.trend) &&
              location.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="200">
                  <AreaChart data={location.trend}>
                    <defs>
                      <linearGradient
                        id={`grad-${location.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 9, fill: "rgba(240,240,240,0.35)" }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="crowd"
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#grad-${location.id})`}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: color,
                        stroke: "#0D0D0D",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="trend-no-data glass-card">
                  <span className="no-data-icon">😴</span>
                  <p>No busy-hour data available yet</p>
                </div>
              )}
            </div>
          </div>

          {pendingAction && (
            <motion.div
              className="contribution-confirm glass"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="contribution-confirm-title">
                Confirm Contribution
              </div>
              <div className="contribution-confirm-text">
                {pendingAction === "verify"
                  ? "Confirm crowd level is correct?"
                  : "Let others know you are heading here?"}
              </div>
              <div className="contribution-confirm-actions">
                <button
                  className="confirm-cancel-btn"
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-submit-btn"
                  onClick={handleConfirmAction}
                >
                  Yes, Contribute
                </button>
              </div>
            </motion.div>
          )}

          <div className="vibe-action-group">
            <motion.button
              className={`verify-btn ${verified ? "verified" : location.crowdLevel}`}
              onClick={() => setPendingAction("verify")}
              disabled={
                verified || location.crowdLevel === "closed" || !!pendingAction
              }
              style={{ flex: 1 }}
            >
              {verified ? "✅ Verified!" : "👆 Verify Level"}
            </motion.button>

            <motion.button
              className={`verify-btn ${going ? "verified" : ""}`}
              onClick={() => setPendingAction("heading")}
              disabled={
                going || location.crowdLevel === "closed" || !!pendingAction
              }
              style={{
                flex: 1,
                border: "1px solid rgba(168, 85, 247, 0.4)",
                color: "#A855F7",
                background: "rgba(168, 85, 247, 0.1)",
              }}
            >
              {going ? "✅ Going!" : "🏃 Heading Here"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="submit-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: "fixed", inset: 0, zIndex: 1000 }}
          >
            <button className="success-close" onClick={handleCloseSuccess}>
              ✕
            </button>
            <motion.div
              className="success-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
            >
              🚀
            </motion.div>
            <motion.div className="success-title">{successTitle}</motion.div>
            <motion.div className="success-points">+10 Karma Points</motion.div>
            <motion.div className="success-sub">Thanks for help!</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
