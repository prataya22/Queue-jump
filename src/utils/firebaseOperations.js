import { ref, update, push, set, get } from 'firebase/database';
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

/**
 * Add karma points to user profile in Firebase
 * @param {string} userId - The user ID
 * @param {number} points - Points to add
 * @param {string} action - Description of the action
 */
export const addUserKarma = async (userId, points, action) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const timestamp = new Date().toISOString();
    
    await update(userRef, {
      lastActivity: timestamp,
      [`activity/${timestamp}`]: {
        action,
        points,
      },
    });
    console.log(`Added ${points} karma points to user ${userId}`);
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
        karma: {
          points: 0,
          level: 'novice',
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
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
      });
    }
  } catch (error) {
    console.error('Error verifying location:', error);
    throw error;
  }
};
