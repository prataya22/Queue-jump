// Queue-Jump Mock Data Layer
// Campus locations + Tech Fest Stalls with live-updating crowd data
// College hours: 10 AM – 6 PM

export const COLLEGE_OPEN_HOUR = 10; // 10 AM
export const COLLEGE_CLOSE_HOUR = 18; // 6 PM

export const CROWD_LEVELS = {
  EMPTY: 'empty',
  MODERATE: 'moderate',
  PACKED: 'packed',
  CLOSED: 'closed',
};

export const CROWD_COLORS = {
  empty: '#00FF88',
  moderate: '#FFB800',
  packed: '#FF2D55',
  closed: '#666666',
};

export const CROWD_LABELS = {
  empty: 'Empty',
  moderate: 'Moderate',
  packed: 'Packed',
  closed: 'Closed',
};

// Check if the college is currently open
export function isCollegeOpen() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= COLLEGE_OPEN_HOUR && hour < COLLEGE_CLOSE_HOUR;
}

// Get a readable status string for closed hours
export function getClosedMessage() {
  const now = new Date();
  const hour = now.getHours();
  if (hour < COLLEGE_OPEN_HOUR) {
    return `Opens at ${COLLEGE_OPEN_HOUR} AM`;
  }
  return `Closed · Opens at ${COLLEGE_OPEN_HOUR} AM`;
}

function generateTrendData() {
  const hours = [];
  for (let h = COLLEGE_OPEN_HOUR; h <= COLLEGE_CLOSE_HOUR; h++) {
    const label = h <= 12 ? `${h}AM` : `${h - 12}PM`;
    hours.push({
      hour: label === '12AM' ? '12PM' : label,
      crowd: Math.floor(Math.random() * 100),
    });
  }
  // Make lunch/peak times busier (12 PM – 2 PM)
  const lunchStart = 12 - COLLEGE_OPEN_HOUR; // index for 12 PM
  if (hours[lunchStart]) hours[lunchStart].crowd = Math.max(hours[lunchStart].crowd, 75);
  if (hours[lunchStart + 1]) hours[lunchStart + 1].crowd = Math.max(hours[lunchStart + 1].crowd, 85);
  if (hours[lunchStart + 2]) hours[lunchStart + 2].crowd = Math.max(hours[lunchStart + 2].crowd, 65);
  return hours;
}

function getCrowdLevel(wait) {
  if (wait <= 10) return CROWD_LEVELS.EMPTY;
  if (wait <= 25) return CROWD_LEVELS.MODERATE;
  return CROWD_LEVELS.PACKED;
}

// Helper to generate realistic timestamps
function getRealisticTimestamp(minutesAgo) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - minutesAgo);
  return now.toISOString();
}

export const initialLocations = [
  // Campus Locations
  {
    id: 'canteen',
    name: 'Canteen',
    icon: '🍔',
    category: 'campus',
    x: 25,
    y: 30,
    currentWait: 15,
    crowdLevel: 'moderate',
    reports: 24,
    verifications: 18,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(2),
    accuracy: 87,
    trend: generateTrendData(),
  },
  {
    id: 'library',
    name: 'Library',
    icon: '📚',
    category: 'campus',
    x: 50,
    y: 55,
    currentWait: 30,
    crowdLevel: 'packed',
    reports: 45,
    verifications: 38,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(1),
    accuracy: 94,
    trend: generateTrendData(),
  },
  {
    id: 'xerox',
    name: 'Xerox Shop',
    icon: '🖨️',
    category: 'campus',
    x: 15,
    y: 70,
    currentWait: 20,
    crowdLevel: 'moderate',
    reports: 31,
    verifications: 22,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(3),
    accuracy: 81,
    trend: generateTrendData(),
  },
  // Tech Fest Stalls
  {
    id: 'robotics',
    name: 'Robotics Arena',
    icon: '🤖',
    category: 'fest',
    x: 40,
    y: 18,
    currentWait: 35,
    crowdLevel: 'packed',
    reports: 56,
    verifications: 42,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(1),
    accuracy: 90,
    trend: generateTrendData(),
  },
  {
    id: 'aiml',
    name: 'AI/ML Showcase',
    icon: '🧠',
    category: 'fest',
    x: 62,
    y: 45,
    currentWait: 25,
    crowdLevel: 'moderate',
    reports: 38,
    verifications: 30,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(2),
    accuracy: 88,
    trend: generateTrendData(),
  },
  {
    id: 'gaming',
    name: 'Gaming Zone',
    icon: '🎮',
    category: 'fest',
    x: 80,
    y: 60,
    currentWait: 40,
    crowdLevel: 'packed',
    reports: 67,
    verifications: 55,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(0.5),
    accuracy: 95,
    trend: generateTrendData(),
  },
  {
    id: 'foodcourt',
    name: 'Food Court',
    icon: '🍕',
    category: 'fest',
    x: 30,
    y: 78,
    currentWait: 22,
    crowdLevel: 'moderate',
    reports: 41,
    verifications: 33,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(1),
    accuracy: 86,
    trend: generateTrendData(),
  },
  {
    id: 'registration',
    name: 'Registration Desk',
    icon: '📝',
    category: 'fest',
    x: 55,
    y: 85,
    currentWait: 8,
    crowdLevel: 'empty',
    reports: 19,
    verifications: 15,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(4),
    accuracy: 91,
    trend: generateTrendData(),
  },
  {
    id: 'exhibition',
    name: 'Project Exhibition',
    icon: '🔬',
    category: 'fest',
    x: 85,
    y: 35,
    currentWait: 18,
    crowdLevel: 'moderate',
    reports: 29,
    verifications: 21,
    headingHereNow: 0,
    lastUpdated: getRealisticTimestamp(2),
    accuracy: 83,
    trend: generateTrendData(),
  },
];

export const reportPresets = [
  { id: 'fast', label: 'Line is moving fast', emoji: '⚡', impact: -5 },
  { id: 'dead', label: 'Completely dead', emoji: '💀', impact: -15 },
  { id: 'avoid', label: 'Avoid at all costs', emoji: '🚫', impact: 15 },
  { id: 'busier', label: 'Getting busier', emoji: '📈', impact: 10 },
  { id: 'steady', label: 'Steady flow', emoji: '🌊', impact: 0 },
  { id: 'clearing', label: 'Clearing out', emoji: '🏃', impact: -8 },
];

// Apply operating hours — marks all locations as closed outside 10 AM – 6 PM
export function applyOperatingHours(locations) {
  if (isCollegeOpen()) return locations;

  return locations.map((loc) => ({
    ...loc,
    currentWait: 0,
    headingHereNow: 0,
    crowdLevel: 'closed',
    lastUpdated: getClosedMessage(),
  }));
}

// Simulate live updates (only updates when college is open)
export function simulateLiveUpdate(locations) {
  if (!isCollegeOpen()) {
    return applyOperatingHours(locations);
  }

  return locations.map((loc) => {
    const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
    const newWait = Math.max(0, Math.min(30, loc.currentWait + delta));
    const newCrowdLevel = getCrowdLevel(newWait);
    
    // Naturally decay headingHereNow or randomly pop it up slightly
    const intentDelta = Math.random() > 0.8 ? 1 : Math.random() > 0.5 ? -1 : 0;
    const newHeadingHere = Math.max(0, (loc.headingHereNow || 0) + intentDelta);

    const timesAgo = ['just now', '30 sec ago', '1 min ago', '2 min ago'];
    return {
      ...loc,
      currentWait: newWait,
      crowdLevel: newCrowdLevel,
      headingHereNow: newHeadingHere,
      lastUpdated: timesAgo[Math.floor(Math.random() * timesAgo.length)],
      reports: loc.reports + (Math.random() > 0.7 ? 1 : 0),
    };
  });
}
