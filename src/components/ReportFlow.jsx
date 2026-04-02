import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportPresets, isCollegeOpen } from '../data/mockData';

export default function ReportFlow({ locations, onClose, onSubmit }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [waitTime, setWaitTime] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const getSliderColor = () => {
    if (waitTime <= 10) return '#00FF88';
    if (waitTime <= 25) return '#FFB800';
    return '#FF2D55';
  };

  const handleSubmit = () => {
    if (!selectedLocation) return;
    setShowSuccess(true);
    onSubmit({
      locationId: selectedLocation,
      waitTime,
      preset: selectedPreset,
    });
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 2000);
  };

  const sliderColor = getSliderColor();

  return (
    <>
      <motion.div
        className="report-overlay"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="report-header">
          <h2>📡 Report Crowd</h2>
          <button className="vibe-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="report-content">
          {/* Location Selector */}
          <div className="report-location">
            <label>Select Location</label>
            <div className="location-grid">
              {locations.map((loc) => (
                <motion.button
                  key={loc.id}
                  className={`location-option ${selectedLocation === loc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLocation(loc.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  <span>{loc.icon}</span>
                  <span>{loc.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wait Time Slider */}
          <div className="report-slider-section">
            <label>Estimated Wait Time</label>
            <div className="slider-display glass-card">
              <div className="slider-ring" style={{ borderTopColor: sliderColor }} />
              <motion.div
                className="slider-value"
                style={{ color: sliderColor }}
                key={waitTime}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {waitTime}
              </motion.div>
              <span className="slider-unit">minutes</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={waitTime}
              onChange={(e) => setWaitTime(Number(e.target.value))}
              className="range-slider"
              style={{
                background: `linear-gradient(to right, ${sliderColor} ${(waitTime / 60) * 100}%, rgba(255,255,255,0.08) ${(waitTime / 60) * 100}%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: 'var(--text-tertiary)' }}>
              <span>0 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="report-presets">
            <label>Quick Status</label>
            <div className="preset-grid">
              {reportPresets.map((preset) => (
                <motion.button
                  key={preset.id}
                  className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="preset-emoji">{preset.emoji}</span>
                  <span>{preset.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <motion.button
            className="report-submit"
            onClick={handleSubmit}
            disabled={!selectedLocation || !isCollegeOpen()}
            whileTap={!(!selectedLocation || !isCollegeOpen()) ? { scale: 0.97 } : {}}
          >
            {!isCollegeOpen() 
              ? '🚫 College is closed' 
              : selectedLocation 
                ? 'Submit Report → +10 Karma' 
                : 'Select a location first'}
          </motion.button>
        </div>
      </motion.div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="submit-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="success-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              🎉
            </motion.div>
            <motion.div
              className="success-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Report Submitted!
            </motion.div>
            <motion.div
              className="success-points"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              +10 Karma Points
            </motion.div>
            <motion.div
              className="success-sub"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Thanks for helping the community!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
