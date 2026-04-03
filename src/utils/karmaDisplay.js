import { initialKarma } from '../data/mockData';

const TIERS = [
  { min: 0, level: 1, name: 'Novice', next: 100 },
  { min: 100, level: 2, name: 'Contributor', next: 250 },
  { min: 250, level: 3, name: 'Campus Scout', next: 500 },
  { min: 500, level: 4, name: 'Expert', next: 1000 },
  { min: 1000, level: 5, name: 'Legend', next: 2000 },
];

function tierForPoints(points) {
  let t = TIERS[0];
  for (const tier of TIERS) {
    if (points >= tier.min) t = tier;
  }
  return { level: t.level, levelName: t.name, nextLevel: t.next };
}

function recentActivityFromFirebase(activity) {
  if (!activity || typeof activity !== 'object') return [];
  return Object.entries(activity)
    .map(([isoKey, v]) => ({
      action: v.action,
      points: v.points,
      at: Date.parse(isoKey) || Date.now(),
    }))
    .filter((e) => e.action != null)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
}

/**
 * Maps Firebase `users/{uid}` snapshot to the KarmaPanel shape.
 */
export function buildKarmaDisplayFromFirebase(userData) {
  const points = userData.karma?.points ?? userData.karmaPoint ?? 0;
  const { level, levelName, nextLevel } = tierForPoints(points);
  const recentActivity = recentActivityFromFirebase(userData.activity);

  return {
    points,
    level,
    levelName,
    nextLevel,
    badges: initialKarma.badges,
    recentActivity,
  };
}

/** Placeholder while Firebase user node is loading. */
export function emptyKarmaPlaceholder() {
  return {
    points: 0,
    level: 1,
    levelName: 'Novice',
    nextLevel: 100,
    badges: initialKarma.badges,
    recentActivity: [],
  };
}
