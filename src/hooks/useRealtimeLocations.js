import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { applyOperatingHours, initialLocations } from '../data/mockData';

/**
 * Custom hook for real-time location data from Firebase
 * Falls back to mock data if database is unavailable
 */
export const useRealtimeLocations = () => {
  const [locations, setLocations] = useState(() => initialLocations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Reference to locations in Firebase Realtime Database
      const locationsRef = ref(database, 'locations');

      // Set up real-time listener
      const unsubscribe = onValue(
        locationsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object to array if needed
           // Convert object to array AND ensure IDs are safely attached
            let rawArray = [];
            if (Array.isArray(data)) {
              // If Firebase treats it as an array, the index is the ID
              data.forEach((val, index) => {
                if (val) rawArray.push({ ...val, id: String(index) });
              });
            } else {
              rawArray = Object.entries(data).map(([key, val]) => ({ ...val, id: String(key) }));
            }

            

            const mergedArray = initialLocations.map(baseLoc => {
              // Wrap both sides in String() to guarantee a match!
              const dbLoc = rawArray.find(l => String(l.id) === String(baseLoc.id));
              
          
            
              // Load the user's latest local report from localStorage (Optimistic Persistence)
              let localReport = null;
              try {
                const stored = localStorage.getItem('queuejump_local_reports');
                if (stored) {
                  const reports = JSON.parse(stored);
                  localReport = reports[baseLoc.id];
                }
              } catch (e) {}

              // Helper for safe timestamp comparison
              const getTime = (val) => {
                if (!val) return 0;
                if (typeof val === 'string' && (val.includes('ago') || val.includes('now'))) return 0; // Mock data is older
                const d = new Date(val);
                return isNaN(d.getTime()) ? 0 : d.getTime();
              };
              let chosen = dbLoc || baseLoc;
              const dbTime = getTime(dbLoc?.lastUpdated);
              const localTime = getTime(localReport?.lastUpdated);

             if (dbLoc) {
               chosen = { ...baseLoc, ...dbLoc };
              }

             // Always take headingHereNow from Firebase directly
              if (dbLoc?.headingHereNow != null) {
               chosen = { ...chosen, headingHereNow: dbLoc.headingHereNow };
              }

              return {
                ...chosen,
                // Ensure trend is always an array to prevent chart crashes
                trend: chosen.trend || baseLoc.trend || []
              };
            });

            setLocations(mergedArray);
            setError(null);
          } else {
            console.warn('No locations data in database, using mock data');
            setLocations(initialLocations);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching locations:', error);
          // Fallback to mock data on error
          setLocations(applyOperatingHours(initialLocations));
          setError(error.message);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => {
        off(locationsRef);
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up listener:', err);
      setLocations(applyOperatingHours(initialLocations));
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { locations, loading, error };
};

/**
 * Hook for real-time user karma/profile data
 */
export const useRealtimeUserData = (userId) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      const userRef = ref(database, `users/${userId}`);

      const unsubscribe = onValue(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
            setError(null);
          } else {
            setUserData(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching user data:', error);
          setError(error.message);
          setLoading(false);
        }
      );

      return () => {
        off(userRef);
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up user listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId]);

  return { userData, loading, error };
};
