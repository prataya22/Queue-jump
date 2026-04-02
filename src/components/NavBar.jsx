import { motion } from 'framer-motion';

const navItems = [
  { id: 'map', icon: '🗺️', label: 'Map' },
  { id: 'report', icon: '📡', label: 'Report' },
  { id: 'karma', icon: '⚡', label: 'Karma' },
];

export default function NavBar({ activeTab, onTabChange }) {
  return (
    <nav className="nav-bar">
      {navItems.map((item) => (
        <motion.button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
          whileTap={{ scale: 0.9 }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
          <span className="nav-dot" />
        </motion.button>
      ))}
    </nav>
  );
}
