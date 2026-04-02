import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CROWD_COLORS, CROWD_LABELS } from '../data/mockData';

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
  const [goingNow, setGoingNow] = useState(false);
  const color = CROWD_COLORS[location.crowdLevel];
  const label = CROWD_LABELS[location.crowdLevel];

  const handleVerify = () => {
    setVerified(true);
    onVerify(location.id);
    setTimeout(() => setVerified(false), 2000);
  };

  const handleGoingNowClick = () => {
    setGoingNow(true);
    onGoingNow(location.id);
  };

  return (
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
        {/* Background Glow */}
        <div className={`vibe-card-glow ${location.crowdLevel}`} />

        {/* Header */}
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
          <button className="vibe-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Current Vibe */}
        <div className="current-vibe glass">
          <div className={`vibe-status-dot ${location.crowdLevel}`} />
          <div>
            {location.crowdLevel === 'closed' ? (
              <div className="vibe-wait-time closed" style={{ fontSize: '28px', marginTop: '4px' }}>Closed</div>
            ) : (
              <>
                <div className={`vibe-wait-time ${location.crowdLevel}`}>
                  {location.currentWait > 0 ? `${location.currentWait}` : '0'}
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

        {/* Predictive Intent Alert */}
        {location.headingHereNow > 0 && location.crowdLevel !== 'closed' && (
          <motion.div 
            className={`vibe-surge-alert ${location.headingHereNow > 2 ? 'surge' : ''}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="surge-icon">{location.headingHereNow > 2 ? '⚠️' : '🏃'}</div>
            <div className="surge-text">
              {location.headingHereNow > 2 ? (
                <span className="surge-warning">Crowd expected to surge! {location.headingHereNow} people heading here</span>
              ) : (
                <>{location.headingHereNow} people heading here right now</>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="vibe-stats">
          <div className="vibe-stat">
            <div className="vibe-stat-value">{location.reports}</div>
            <div className="vibe-stat-label">Reports</div>
          </div>
          <div className="vibe-stat">
            <div className="vibe-stat-value">{location.lastUpdated}</div>
            <div className="vibe-stat-label">Updated</div>
          </div>
          <div className="vibe-stat">
            <div className="vibe-stat-value">{location.accuracy}%</div>
            <div className="vibe-stat-label">Accuracy</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="vibe-trend">
          <div className="vibe-trend-title">📊 Busy Hours Today</div>
          <div className="trend-chart-container">
            <ResponsiveContainer width="100%" height="100%">
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
                  activeDot={{
                    r: 4,
                    fill: color,
                    stroke: '#0D0D0D',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actions */}
        <div className="vibe-action-group">
          <motion.button
            className={`verify-btn ${verified ? 'verified' : location.crowdLevel}`}
            onClick={handleVerify}
            whileTap={location.crowdLevel !== 'closed' && !verified ? { scale: 0.96 } : {}}
            disabled={verified || location.crowdLevel === 'closed'}
            style={{ flex: 1 }}
          >
            {location.crowdLevel === 'closed' ? (
              <>🚫 Closed</>
            ) : verified ? (
              <>✅ Verified!</>
            ) : (
              <>👆 Verify Level</>
            )}
          </motion.button>
          
          <motion.button
            className={`verify-btn ${goingNow ? 'verified' : ''}`}
            onClick={handleGoingNowClick}
            whileTap={location.crowdLevel !== 'closed' && !goingNow ? { scale: 0.96 } : {}}
            disabled={goingNow || location.crowdLevel === 'closed'}
            style={{ flex: 1, border: '1px solid rgba(168, 85, 247, 0.4)', color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)' }}
          >
            {location.crowdLevel === 'closed' ? (
              <>🚫 Closed</>
            ) : goingNow ? (
              <>✅ Going!</>
            ) : (
              <>🏃 I'm Heading Here</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
