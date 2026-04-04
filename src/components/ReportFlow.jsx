import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportPresets, isCollegeOpen } from '../data/mockData';

export default function ReportFlow({ locations, onClose, onSubmit, isAuthorized, onLoginClick }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [waitTime, setWaitTime] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: Log available locations
  console.log('📋 ReportFlow Locations:', locations?.map(l => ({ id: l.id, name: l.name })) || 'NONE');

  const getSliderColor = () => {
    if (waitTime <= 10) return '#00FF88';
    if (waitTime <= 25) return '#FFB800';
    return '#FF2D55';
  };

  const handleSubmit = async () => {
    console.log('📡 Report Submit Debug:', {
      selectedLocation,
      isAuthorized,
      isSubmitting,
      collegeOpen: isCollegeOpen(),
      waitTime
    });
    
    if (!selectedLocation || !isAuthorized) {
      console.warn('❌ Submit blocked - selectedLocation:', selectedLocation, 'isAuthorized:', isAuthorized);
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('✅ Calling onSubmit with:', { selectedLocation, waitTime });
      await onSubmit({
        locationId: selectedLocation,
        waitTime,
        preset: selectedPreset,
      });
      setShowSuccess(true);
    } catch (e) {
      console.error('💥 Submit failed:', e);
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setIsSubmitting(false);
    onClose();
    // Reset form
    setSelectedLocation(null);
    setWaitTime(15);
    setSelectedPreset(null);
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
          {!isAuthorized ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              <motion.div 
                style={{ fontSize: '48px' }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🔐
              </motion.div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Login to Submit Reports</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', maxWidth: '280px' }}>
                Only verified accounts can submit crowd reports to ensure data quality and build community trust.
              </p>
              <motion.button
                onClick={onLoginClick}
                style={{
                  marginTop: '10px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '250px'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                📧 Sign In Now
              </motion.button>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '10px' }}>
                Use your college account to get started
              </p>
            </div>
          ) : (
            <>
              {/* Location Selector */}
              <div className="report-location">
                <label>Select Location ({locations?.length || 0} available)</label>
                <div className="location-grid">
                  {locations && locations.length > 0 ? (
                    locations.map((loc) => {
                      console.log('📍 Location in grid:', loc.id, loc.name);
                      return (
                        <motion.button
                          key={loc.id}
                          className={`location-option ${selectedLocation === loc.id ? 'selected' : ''}`}
                          onClick={() => {
                            console.log('✓ Selected location:', loc.id, loc.name);
                            setSelectedLocation(loc.id);
                          }}
                          whileTap={{ scale: 0.97 }}
                          disabled={isSubmitting}
                        >
                          <span>{loc.icon}</span>
                          <span>{loc.name}</span>
                        </motion.button>
                      );
                    })
                  ) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'red', fontSize: '12px' }}>
                      ❌ No locations available
                    </div>
                  )}
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
              max="30"
              value={waitTime}
              onChange={(e) => setWaitTime(Number(e.target.value))}
              className="range-slider"
              disabled={isSubmitting}
              style={{
                background: `linear-gradient(to right, ${sliderColor} ${(waitTime / 30) * 100}%, rgba(255,255,255,0.08) ${(waitTime / 30) * 100}%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: 'var(--text-tertiary)' }}>
              <span>0 min</span>
              <span>15 min</span>
              <span>30 min</span>
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
                  disabled={isSubmitting}
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
                disabled={!selectedLocation || !isCollegeOpen() || isSubmitting}
                whileTap={!(!selectedLocation || !isCollegeOpen() || isSubmitting) ? { scale: 0.97 } : {}}
              >
                {isSubmitting
                  ? '⏳ Submitting...'
                  : !isCollegeOpen() 
                    ? '🚫 College is closed' 
                    : selectedLocation 
                      ? 'Submit Report → +20 Karma' 
                      : 'Select a location first'}
              </motion.button>
            </>
          )}
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
            <button className="success-close" onClick={handleCloseSuccess}>
              ✕
            </button>
            <motion.div
              className="success-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              👍
            </motion.div>
            <motion.div
              className="success-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Thanks for Reporting!
            </motion.div>
            <motion.div
              className="success-points"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              +20 Karma Incoming
            </motion.div>
            <motion.div
              className="success-sub"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              We will update after confirmation and reflect your karma points
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
