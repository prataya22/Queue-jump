const TIERS = [
  { min: 0, level: 1, name: 'Novice', next: 100 },
  { min: 100, level: 2, name: 'Contributor', next: 250 },
  { min: 250, level: 3, name: 'Campus Scout', next: 500 },
  { min: 500, level: 4, name: 'Expert', next: 1000 },
  { min: 1000, level: 5, name: 'Legend', next: 2000 },
];

export function tierForPoints(points) {
  let t = TIERS[0];
  for (const tier of TIERS) {
    if (points >= tier.min) t = tier;
  }
  return { level: t.level, levelName: t.name, nextLevel: t.next };
}

/** Static badge metadata; `earned` is computed from progress. */
export const BADGE_DEFINITIONS = [
  {
    id: 'reporter',
    name: 'First Reporter',
    icon: '📡',
    desc: 'Made your first crowd report',
    isEarned: (points, acts) =>
      acts.some((a) => 
        (String(a.action).includes('Reported') && String(a.action).includes('wait at')) ||
        String(a.action).includes('Wait time report approved at')
      ),
  },
  {
    id: 'verifier',
    name: 'Verifier',
    icon: '✅',
    desc: 'Verified 10 crowd levels',
    isEarned: (points, acts) =>
      acts.filter((a) => String(a.action).includes('Confirmed crowd status')).length >= 10,
  },
  {
    id: 'hero',
    name: 'Campus Hero',
    icon: '🦸',
    desc: 'Reach 500 karma helping others skip the queue',
    isEarned: (points) => points >= 500,
  },
  {
    id: 'streak',
    name: 'Streak Master',
    icon: '🔥',
    desc: '7-day reporting streak (coming soon)',
    isEarned: () => false,
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    icon: '🚀',
    desc: 'First to report at a new location (coming soon)',
    isEarned: () => false,
  },
];

export function computeBadges(points, activities) {
  // Ensure activities is an array
  const safeActivities = Array.isArray(activities) ? activities : [];
  
  return BADGE_DEFINITIONS.map((def) => ({
    ...def,
    earned: def.isEarned(points, safeActivities),
  }));
}

function recentActivityFromFirebase(activity) {
  if (!activity || typeof activity !== 'object') return [];
  return Object.entries(activity)
    .map(([isoKey, v]) => ({
      action: v.action,
      points: v.points,
      at: Date.parse(isoKey.replace(/_/g, '.')) || Date.now(),
    }))
    .filter((e) => e.action != null)
    .sort((a, b) => b.at - a.at)
    .slice(0, 20);
}

function activitiesForBadgeCheck(userData, recentActivityList) {
  if (recentActivityList?.length) return recentActivityList;
  return recentActivityFromFirebase(userData?.activity);
}

/**
 * Maps Firebase `users/{uid}` snapshot to the KarmaPanel shape.
 */
export function buildKarmaDisplayFromFirebase(userData) {
  const points = userData.karma?.points ?? userData.karmaPoint ?? 0;
  const { level, levelName, nextLevel } = tierForPoints(points);
  const recentActivity = recentActivityFromFirebase(userData.activity);
  const badges = computeBadges(points, activitiesForBadgeCheck(userData, recentActivity));

  return {
    points,
    level,
    levelName,
    nextLevel,
    badges,
    recentActivity,
  };
}

const GUEST_STORAGE_KEY = 'queuejump_guest_karma';

/** Fresh guest session: zero points, no badges, no activity. */
export function createGuestKarmaState() {
  try {
    const saved = localStorage.getItem(GUEST_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Re-compute to ensure logic updates are applied to old data
      return {
        ...parsed,
        ...tierForPoints(parsed.points || 0),
        badges: computeBadges(parsed.points || 0, parsed.recentActivity || []),
      };
    }
  } catch (e) {
    console.warn('Failed to load guest karma from storage:', e);
  }

  return {
    points: 0,
    ...tierForPoints(0),
    badges: computeBadges(0, []),
    recentActivity: [],
  };
}

/** Merge guest karma after an action (local-only). */
export function appendGuestKarma(prev, delta, actionLabel) {
  const nextPoints = (prev.points || 0) + delta;
  const recentActivity = [
    { action: actionLabel, points: delta, at: Date.now() },
    ...(prev.recentActivity || []).slice(0, 19),
  ];
  const newState = {
    points: nextPoints,
    ...tierForPoints(nextPoints),
    badges: computeBadges(nextPoints, recentActivity),
    recentActivity,
  };

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(newState));
  } catch (e) {
    console.warn('Failed to save guest karma to storage:', e);
  }

  return newState;
}
