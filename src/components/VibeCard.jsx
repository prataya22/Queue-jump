import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CROWD_COLORS, CROWD_LABELS } from '../data/mockData';

// Helper to format ISO timestamps into relative strings like "2m ago"
function formatRelativeTime(isoString) {
  if (!isoString) return '2 min ago';
  if (isoString.includes('ago')) return isoString; 

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p style={{ color: '#00E5FF', fontSize: '12px', fontWeight: 700 }}>
          {label}
        </p>
        <p style={{ color: '#F0F0F0', fontSize: '11px', fontWeight: 500 }}>
          Crowd Level: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export default function VibeCard({ location, onClose, onVerify, onGoingNow }) {
  const [verified, setVerified] = useState(false);
  const [going, setGoing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Success Overlay States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');

  const color = CROWD_COLORS[location.crowdLevel] || '#666';
  const label = CROWD_LABELS[location.crowdLevel] || 'Unknown';

  const confirmVerify = () => {
    onVerify(location.id);
    setVerified(true);
    setSuccessTitle('Verification Successful!');
    setShowSuccess(true);
  };

  const confirmGoingNow = () => {
    onGoingNow(location.id);
    setGoing(true);
    setSuccessTitle('Heading Logged!');
    setShowSuccess(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction === 'verify') {
      confirmVerify();
    } else if (pendingAction === 'heading') {
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
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className={`vibe-card-glow ${location.crowdLevel}`} />

          <div className="vibe-header">
            <div className="vibe-title">
              <span className="vibe-title-icon">{location.icon}</span>
              <div className="vibe-title-text">
                <h2>{location.name}</h2>
                <span className="category-label">
                  {location.category === 'fest' ? '🎪 Tech Fest' : '🏫 Campus'}
                </span>
              </div>
            </div>
            <button className="vibe-close" onClick={onClose}>✕</button>
          </div>

          <div className="current-vibe glass">
            <div className={`vibe-status-dot ${location.crowdLevel}`} />
            <div>
              {location.crowdLevel === 'closed' ? (
                <div className="vibe-wait-time closed">Closed</div>
              ) : (
                <>
                  <div className={`vibe-wait-time ${location.crowdLevel}`}>
                    {location.currentWait ?? 0}
                  </div>
                  <div className="vibe-wait-label">
                    {location.currentWait > 0 ? 'min wait' : 'No wait!'}
                  </div>
                </>
              )}
            </div>
            <div className={`vibe-crowd-label ${location.crowdLevel}`}>
              {label}
            </div>
          </div>

          <div className="vibe-stats">
            <div className="vibe-stat">
              <div className="vibe-stat-value">{location.reports || 0}</div>
              <div className="vibe-stat-label">Reports</div>
            </div>
            <div className="vibe-stat">
              <div className="vibe-stat-value">{formatRelativeTime(location.lastUpdated)}</div>
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
              {location.trend && Array.isArray(location.trend) && location.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="200">
                  <AreaChart data={location.trend}>
                    <defs>
                      <linearGradient id={`grad-${location.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 9, fill: 'rgba(240,240,240,0.35)' }}
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
                      activeDot={{ r: 4, fill: color, stroke: '#0D0D0D', strokeWidth: 2 }}
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
              <div className="contribution-confirm-title">Confirm Contribution</div>
              <div className="contribution-confirm-text">
                {pendingAction === 'verify'
                  ? 'Confirm crowd level is correct?'
                  : 'Let others know you are heading here?'}
              </div>
              <div className="contribution-confirm-actions">
                <button className="confirm-cancel-btn" onClick={() => setPendingAction(null)}>Cancel</button>
                <button className="confirm-submit-btn" onClick={handleConfirmAction}>Yes, Contribute</button>
              </div>
            </motion.div>
          )}

          <div className="vibe-action-group">
            <motion.button
              className={`verify-btn ${verified ? 'verified' : location.crowdLevel}`}
              onClick={() => setPendingAction('verify')}
              disabled={verified || location.crowdLevel === 'closed' || !!pendingAction}
              style={{ flex: 1 }}
            >
              {verified ? '✅ Verified!' : '👆 Verify Level'}
            </motion.button>
            
            <motion.button
              className={`verify-btn ${going ? 'verified' : ''}`}
              onClick={() => setPendingAction('heading')}
              disabled={going || location.crowdLevel === 'closed' || !!pendingAction}
              style={{ flex: 1, border: '1px solid rgba(168, 85, 247, 0.4)', color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)' }}
            >
              {going ? '✅ Going!' : '🏃 Heading Here'}
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
            style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          >
            <button className="success-close" onClick={handleCloseSuccess}>✕</button>
            <motion.div
              className="success-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
            >🚀</motion.div>
            <motion.div className="success-title">{successTitle}</motion.div>
            <motion.div className="success-points">+10 Karma Points</motion.div>
            <motion.div className="success-sub">Thanks for help!</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
