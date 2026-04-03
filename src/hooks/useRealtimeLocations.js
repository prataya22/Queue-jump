import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { applyOperatingHours, initialLocations } from '../data/mockData';

/**
 * Custom hook for real-time location data from Firebase
 * Falls back to mock data if database is unavailable
 */
export const useRealtimeLocations = () => {
  const [locations, setLocations] = useState(() => applyOperatingHours(initialLocations));
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
            const locationsArray = Array.isArray(data)
              ? data
              : Object.values(data);
            setLocations(locationsArray);
            setError(null);
          } else {
            console.warn('No locations data in database, using mock data');
            setLocations(applyOperatingHours(initialLocations));
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
