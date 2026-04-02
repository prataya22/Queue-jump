import { motion } from 'framer-motion';

export default function KarmaPanel({ karma, onClose }) {
  const progressPercent = ((karma.points % 100) / 100) * 100;
  const toNext = karma.nextLevel - karma.points;

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
                title={badge.desc}
              >
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="karma-activity">
          <div className="karma-activity-title">📋 Recent Activity</div>
          {karma.recentActivity.map((item, i) => (
            <motion.div
              key={i}
              className="activity-item"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
            >
              <span className="activity-text">{item.action}</span>
              <div className="activity-meta">
                <span className="activity-points">+{item.points}</span>
                <span className="activity-time">{item.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
