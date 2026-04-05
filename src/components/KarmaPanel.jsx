import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatRelativeTime } from '../utils/time';

export default function KarmaPanel({ karma, onClose }) {
  const [, setTick] = useState(0);
  const progressPercent = ((karma.points % 100) / 100) * 100;
  const toNext = Math.max(0, karma.nextLevel - karma.points);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const activityTime = (item) =>
    item.at != null ? formatRelativeTime(item.at) : item.time ?? '—';

  return (
    <motion.div
      className="karma-overlay"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="karma-header">
        <h2>⚡ Karma Dashboard</h2>
        <button className="vibe-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="karma-content">
        {/* Score Card */}
        <div className="karma-score-card glass-card">
          <motion.div
            className="karma-total"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            {karma.points}
          </motion.div>
          <div className="karma-level-name">
            Level {karma.level} — {karma.levelName}
          </div>
          <div className="karma-progress">
            <div className="karma-progress-bar">
              <motion.div
                className="karma-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              />
            </div>
            <div className="karma-progress-text">
              {toNext} points to Level {karma.level + 1}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="karma-badges">
          <div className="karma-badges-title">🏆 Badges</div>
          <div className="badge-grid">
            {karma.badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
                <div className="badge-tooltip">
                  <div className="badge-tooltip-title">{badge.name}</div>
                  <div className="badge-tooltip-desc">{badge.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Incoming Karma Section */}
        {karma.recentActivity && karma.recentActivity.some(item => item.status === 'pending') && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFB800', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Incoming Karma (Under Review)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {karma.recentActivity.filter(item => item.status === 'pending').map((item, i) => (
                <motion.div
                  key={`pending-${item.at ?? i}`}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2), rgba(255, 184, 0, 0.05))',
                    border: '2px solid rgba(255, 184, 0, 0.4)',
                    borderRadius: '12px',
                    padding: '14px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Animated background glow */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle, rgba(255, 184, 0, 0.15), transparent)',
                      borderRadius: '12px'
                    }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <motion.span
                          style={{ fontSize: '16px' }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                          ⚙️
                        </motion.span>
                        <span style={{ fontSize: '12px', color: 'rgba(255, 184, 0, 0.9)', fontWeight: '600' }}>
                          Awaiting Verification
                        </span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#FFB800' }}>+{item.points}</span>
                    </div>
                    
                    <div style={{ fontSize: '11px', color: 'rgba(255, 184, 0, 0.8)', lineHeight: '1.4' }}>
                      {item.action}
                    </div>
                    
                    {/* Progress bar */}
                    <motion.div
                      style={{
                        height: '3px',
                        background: 'rgba(255, 184, 0, 0.2)',
                        borderRadius: '2px',
                        marginTop: '8px',
                        overflow: 'hidden'
                      }}
                    >
                      <motion.div
                        style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, #FFB800, transparent)',
                          width: '30%'
                        }}
                        animate={{ x: [-100, 500] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="karma-activity">
          <div className="karma-activity-title">📋 Recent Activity</div>
          {karma.recentActivity && karma.recentActivity.length > 0 ? (
            karma.recentActivity.filter(item => item.status !== 'pending').map((item, i) => (
              <motion.div
                key={`${item.at ?? 'legacy'}-${i}`}
                className="activity-item"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(0, 255, 136, 0.1)',
                  borderLeft: '3px solid #00FF88',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                  <span className="activity-text" style={{ flex: 1 }}>
                    ✅ {item.action}
                  </span>
                </div>
                <div className="activity-meta" style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="activity-points" style={{ fontWeight: '600', color: '#00FF88', whiteSpace: 'nowrap' }}>+{item.points}</span>
                  <span className="activity-time" style={{ whiteSpace: 'nowrap' }}>{activityTime(item)}</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
              No activity yet
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
