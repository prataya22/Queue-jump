import { ref, update, push, set, get, runTransaction } from "firebase/database";
import { database } from "../firebase";

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
    console.error("Error updating location:", error);
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
    console.log("Report submitted:", reportData);
  } catch (error) {
    console.error("Error submitting report:", error);
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
    const safeKey = timestamp.replace(/\./g, "_"); // Replace dots with underscores for Firebase keys
    let nextTotal = 0;

    const result = await runTransaction(userRef, (current) => {
      if (current === null) {
        nextTotal = points;
        return {
          id: userId,
          karmaPoint: points,
          karma: { points, level: "novice" },
          lastActivity: timestamp,
          activity: { [safeKey]: { action, points } },
        };
      }
      const prev = current.karma?.points ?? current.karmaPoint ?? 0;
      nextTotal = prev + points;
      const activity = {
        ...(current.activity || {}),
        [safeKey]: { action, points },
      };
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
      console.log(
        `Success: Added ${points} karma to user ${userId}. New total: ${nextTotal}`,
      );
      return nextTotal;
    } else {
      console.warn("Transaction not committed");
      throw new Error("Transaction aborted");
    }
  } catch (error) {
    console.error("Error adding karma:", error);
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
        name: userData.name || "New User",
        email: userData.email,
        karmaPoint: 0,
        karma: {
          points: 0,
          level: "novice",
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
    console.error("Error initializing new user:", error);
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
    console.error("Error verifying location:", error);
    throw error;
  }
};

/**
 * Increment heading-here count for a location (syncs with realtime listeners).
 */
const HEADING_HERE_DECAY_MS = 10 * 60 * 1000; // 10 minutes then decrement

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

      // Auto-decrement after 10 minutes
      setTimeout(async () => {
        try {
          const snap = await get(locationRef);
          if (snap.exists()) {
            const current = snap.val().headingHereNow || 0;
            await update(locationRef, {
              headingHereNow: Math.max(0, current - 1),
              lastUpdated: new Date().toISOString(),
            });
            console.log(`🏃 Heading here count decremented for ${locationId}`);
          }
        } catch (e) {
          console.error("Failed to decrement headingHereNow:", e);
        }
      }, HEADING_HERE_DECAY_MS);
    }
  } catch (error) {
    console.error("Error incrementing heading here:", error);
    throw error;
  }
};

/**
 * Submit a crowd report and track it for verification by other users
 * @param {string} locationId - The location ID
 * @param {string} userId - The reporting user's ID
 * @param {number} waitTime - Reported wait time in minutes
 * @param {string} timestamp - ISO timestamp
 */
const AUTO_VERIFY_DELAY_MS = 5 * 60 * 1000; // 5 minutes — change this as you like

export const submitReportWithVerification = async (
  locationId,
  userId,
  waitTime,
  timestamp,
) => {
  try {
    const reportRef = ref(database, `locations/${locationId}/latestReport`);
    await set(reportRef, {
      reporterId: userId,
      waitTime,
      timestamp,
      verifications: [],
      verificationCount: 0,
      verified: false,
      createdAt: timestamp,
    });
    console.log(`Report submitted for verification at ${locationId}:`, {
      userId,
      waitTime,
    });

    setTimeout(async () => {
      try {
        const snapshot = await get(reportRef);
        if (!snapshot.exists()) return;

        const report = snapshot.val();

        if (!report.verified) {
          const locationRef = ref(database, `locations/${locationId}`);
          const crowdLevel =
            waitTime <= 10 ? "empty" : waitTime <= 25 ? "moderate" : "packed";

          const locSnap = await get(locationRef);
          const currentReports = locSnap.exists()
            ? locSnap.val().reports || 0
            : 0;

          // Update trend data for current hour
          const currentHour = new Date().getHours();
          const existingTrend = locSnap.exists()
            ? locSnap.val().trend || []
            : [];

          const updatedTrend = existingTrend.map((t) => {
            // Match current hour to trend entry
            const tHour =
              t.hour.includes("PM") && !t.hour.includes("12")
                ? parseInt(t.hour) + 12
                : parseInt(t.hour);
            if (tHour === currentHour) {
              return {
                ...t,
                crowd: Math.round((waitTime / 30) * 100), // Convert wait time to crowd percentage
              };
            }
            return t;
          });

          await update(locationRef, {
            currentWait: waitTime,
            crowdLevel,
            reports: currentReports + 1,
            trend: updatedTrend.length > 0 ? updatedTrend : existingTrend,
            lastUpdated: new Date().toISOString(),
          });
          await update(reportRef, { verified: true, autoVerified: true });

          const karmaTotal = await addUserKarma(
            userId,
            20,
            `Wait time report approved at ${locationId}`,
          );
          console.log(
            `⏱️ Auto-approved! Karma awarded. New total: ${karmaTotal}`,
          );
        } else if (report.verified && report.autoVerified) {
          // Already verified but karma might not have been awarded — award it now
          const alreadyAwarded = report.karmaAwarded;
          if (!alreadyAwarded) {
            await update(reportRef, { karmaAwarded: true });
            const karmaTotal = await addUserKarma(
              userId,
              20,
              `Wait time report approved at ${locationId}`,
            );
            console.log(`⏱️ Karma awarded on retry. New total: ${karmaTotal}`);
          }
        }
      } catch (e) {
        console.error("Auto-verify failed:", e);
      }
    }, AUTO_VERIFY_DELAY_MS);
  } catch (error) {
    console.error("Error submitting report with verification:", error);
    throw error;
  }
};

/**
 * Add a verification/upvote to a report
 * @param {string} locationId - The location ID
 * @param {string} userId - The verifying user's ID (must be different from reporter)
 */
export const verifyReportAccuracy = async (locationId, userId) => {
  try {
    const reportRef = ref(database, `locations/${locationId}/latestReport`);
    let awardKarma = false;
    let reporterId = null;

    const result = await runTransaction(reportRef, (report) => {
      if (!report) return null;

      // Prevent self-verification
      if (report.reporterId === userId) {
        return; // Abort transaction
      }

      // Prevent duplicate verification
      const currentVerifications = report.verifications || [];
      if (currentVerifications.includes(userId)) {
        return; // Already verified, don't update
      }

      const newVerifications = [...currentVerifications, userId];
      const verificationCount = newVerifications.length;
      const willBeVerified = verificationCount >= 2;

      // Only award karma if threshold met AND not already awarded
      if (willBeVerified && !report.karmaAwarded) {
        awardKarma = true;
        reporterId = report.reporterId;
      }

      return {
        ...report,
        verifications: newVerifications,
        verificationCount,
        verified: willBeVerified || report.verified,
        lastVerifiedAt: new Date().toISOString(),
        karmaAwarded: awardKarma || report.karmaAwarded,
      };
    });

    if (result.committed && result.snapshot.exists()) {
      const snapData = result.snapshot.val();

      if (awardKarma && reporterId) {
        const locationRef = ref(database, `locations/${locationId}`);
        const waitTime = snapData.waitTime;
        const crowdLevel =
          waitTime <= 10 ? "empty" : waitTime <= 25 ? "moderate" : "packed";

        const locSnap = await get(locationRef);
        const currentReports = locSnap.exists()
          ? locSnap.val().reports || 0
          : 0;

        await update(locationRef, {
          currentWait: waitTime,
          crowdLevel,
          reports: currentReports + 1,
          lastUpdated: new Date().toISOString(),
        });

        await addUserKarma(
          reporterId,
          20,
          `Wait time report approved at ${locationId}`,
        );
        console.log(
          `✅ Verification threshold met! Karma awarded to ${reporterId}`,
        );
      }

      console.log(
        `Report verified by user ${userId}. Total verifications: ${snapData.verificationCount}`,
      );
      return snapData.verified;
    }

    return false;
  } catch (error) {
    console.error("Error verifying report:", error);
    throw error;
  }
};


/**
 * Check if a report has enough verifications to confirm karma
 * @param {string} locationId - The location ID
 * @returns {boolean} - True if verified, false otherwise
 */
export const isReportVerified = async (locationId) => {
  try {
    const reportRef = ref(database, `locations/${locationId}/latestReport`);
    const snapshot = await get(reportRef);

    if (snapshot.exists()) {
      return snapshot.val().verified === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking report verification:", error);
    return false;
  }
};
/**
 * Dispute a report — if 2 disputes come in, invalidate the report
 */
export const disputeReport = async (locationId, disputerId) => {
  try {
    const reportRef = ref(database, `locations/${locationId}/latestReport`);
    let triggerInvalidation = false;
    let reporterId = null;

    const result = await runTransaction(reportRef, (report) => {
      if (!report) return null;

      // Can't dispute your own report
      if (report.reporterId === disputerId) {
        return; // Abort
      }

      // Check if already disputed by this user
      const currentDisputes = report.disputes || [];
      if (currentDisputes.includes(disputerId)) {
        return; // Already disputed, don't update
      }

      const newDisputes = [...currentDisputes, disputerId];
      const disputeCount = newDisputes.length;
      const shouldInvalidate = disputeCount >= 2;

      // Only trigger logic if threshold met AND not already invalidated
      if (shouldInvalidate && !report.invalidated) {
        triggerInvalidation = true;
        reporterId = report.reporterId;
      }

      return {
        ...report,
        disputes: newDisputes,
        disputeCount,
        invalidated: shouldInvalidate || report.invalidated,
      };
    });

    if (result.committed && result.snapshot.exists()) {
      if (triggerInvalidation) {
        // Reset location data
        const locationRef = ref(database, `locations/${locationId}`);
        await update(locationRef, {
          currentWait: null,
          crowdLevel: "unknown",
          lastUpdated: new Date().toISOString(),
        });

        // Penalize the reporter — deduct 10 karma
        if (reporterId) {
          await addUserKarma(
            reporterId,
            -10,
            `Report disputed at ${locationId}`,
          );
        }

        console.log(`🚫 Report invalidated at ${locationId} due to 2+ disputes`);
      }
    }
  } catch (e) {
    console.error("Dispute failed:", e);
  }
};

