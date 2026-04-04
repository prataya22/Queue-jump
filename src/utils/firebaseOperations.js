import { ref, update, push, set, get, runTransaction } from 'firebase/database';
import { database } from '../firebase';

/**
 * Update a location's data in Firebase
 * @param {string} locationId - The location ID
 * @param {object} updates - Object with fields to update
 */
export const updateLocationInFirebase = async (locationId, updates) => {
  try {
    const locationRef = ref(database, `locations/${locationId}`);
    await update(locationRef, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    console.log(`Updated location ${locationId}`, updates);
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

/**
 * Add a report/update to a location's history
 * @param {string} locationId - The location ID
 * @param {object} reportData - Report data to add
 */
export const submitLocationReport = async (locationId, reportData) => {
  try {
    const reportsRef = ref(database, `locations/${locationId}/reports`);
    const newReportRef = push(reportsRef);
    await set(newReportRef, {
      ...reportData,
      timestamp: new Date().toISOString(),
    });
    console.log('Report submitted:', reportData);
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};

const MAX_ACTIVITY_KEYS = 80;

/**
 * Add karma points and persist total on the user profile (Realtime DB).
 * Activity entries are keyed by ISO timestamp for ordering in the UI.
 */
export const addUserKarma = async (userId, points, action) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const timestamp = new Date().toISOString();
    const safeKey = timestamp.replace(/\./g, '_'); // Replace dots with underscores for Firebase keys
    let nextTotal = 0;

    const result = await runTransaction(userRef, (current) => {
      if (current === null) {
        nextTotal = points;
        return {
          id: userId,
          karmaPoint: points,
          karma: { points, level: 'novice' },
          lastActivity: timestamp,
          activity: { [safeKey]: { action, points } },
        };
      }
      const prev = current.karma?.points ?? current.karmaPoint ?? 0;
      nextTotal = prev + points;
      const activity = { ...(current.activity || {}), [safeKey]: { action, points } };
      const keys = Object.keys(activity).sort();
      if (keys.length > MAX_ACTIVITY_KEYS) {
        keys.slice(0, keys.length - MAX_ACTIVITY_KEYS).forEach((k) => {
          delete activity[k];
        });
      }
      return {
        ...current,
        karmaPoint: nextTotal,
        karma: { ...(current.karma || {}), points: nextTotal },
        lastActivity: timestamp,
        activity,
      };
    });

    if (result.committed) {
      console.log(`Success: Added ${points} karma to user ${userId}. New total: ${nextTotal}`);
      return nextTotal;
    } else {
      console.warn('Transaction not committed');
      throw new Error('Transaction aborted');
    }
  } catch (error) {
    console.error('Error adding karma:', error);
    throw error;
  }
};

/**
 * Initialize a new user with 0 karma points (called on first login)
 * @param {string} userId - The user ID
 * @param {object} userData - User data from Firebase Auth
 */
export const initializeNewUser = async (userId, userData) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    // Only initialize if user doesn't exist
    if (!snapshot.exists()) {
      await set(userRef, {
        id: userId,
        name: userData.name || 'New User',
        email: userData.email,
        karmaPoint: 0,
        karma: {
          points: 0,
          level: 'novice',
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        activity: {},
      });
      console.log(`Initialized new user ${userId} with 0 karma points`);
    } else {
      console.log(`User ${userId} already exists, skipping initialization`);
    }
  } catch (error) {
    console.error('Error initializing new user:', error);
    throw error;
  }
};

/**
 * Update a location's verification count
 */
export const verifyLocationCrowd = async (locationId) => {
  try {
    const locationRef = ref(database, `locations/${locationId}`);
    const snapshot = await get(locationRef);
    
    if (snapshot.exists()) {
      const verifications = (snapshot.val().verifications || 0) + 1;
      await update(locationRef, {
        verifications,
        lastVerifiedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error verifying location:', error);
    throw error;
  }
};

/**
 * Increment heading-here count for a location (syncs with realtime listeners).
 */
export const incrementHeadingHere = async (locationId) => {
  try {
    const locationRef = ref(database, `locations/${locationId}`);
    const snapshot = await get(locationRef);
    if (snapshot.exists()) {
      const headingHereNow = (snapshot.val().headingHereNow || 0) + 1;
      await update(locationRef, {
        headingHereNow,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error incrementing heading here:', error);
    throw error;
  }
};
