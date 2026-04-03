# Real-Time Data Integration Guide - Queue-Jump

## Overview
Your Queue-Jump app is now connected to **Firebase Realtime Database** for live updates of location queues, crowds, and user karma.

## Setup Steps

### 1. Update Your `.env.local` File
Add the Firebase Realtime Database URL to your environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_AUTH_DOMAIN=your_auth_domain
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_storage_bucket
VITE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_APP_ID=your_app_id
VITE_DATABASE_URL=https://your-project-id.firebaseio.com
```

Get the `VITE_DATABASE_URL` from Firebase Console:
- Go to **Project Settings** → **Service Accounts**
- Look for "Database URL" in Realtime Database section
- Format: `https://[PROJECT-ID].firebaseio.com`

### 2. Firebase Database Structure

Set up your Realtime Database with this structure:

```
{
  "locations": {
    "canteen": {
      "id": "canteen",
      "name": "Canteen",
      "icon": "🍔",
      "category": "campus",
      "x": 25,
      "y": 30,
      "currentWait": 15,
      "crowdLevel": "moderate",
      "reports": 24,
      "verifications": 5,
      "headingHereNow": 3,
      "lastUpdated": "2024-01-15T14:30:00Z"
    },
    "infodesk": {
      "id": "infodesk",
      "name": "Info Desk",
      "icon": "ℹ️",
      "category": "campus",
      ...
    }
  },
  "users": {
    "user-uid-123": {
      "id": "user-uid-123",
      "name": "John Doe",
      "email": "john@example.com",
      "karma": {
        "points": 125,
        "level": "scout",
        "recentActivity": {
          "activity-1": {
            "action": "Verified crowd at Canteen",
            "points": 5,
            "time": "2024-01-15T14:30:00Z"
          }
        }
      },
      "lastActivity": "2024-01-15T14:30:00Z"
    }
  }
}
```

### 3. Firebase Security Rules

Set up these security rules to protect your data:

```json
{
  "rules": {
    "locations": {
      ".read": true,
      ".write": "root.child('admins').child(auth.uid).exists()",
      "$locationId": {
        "reports": {
          ".write": "auth != null",
          ".read": true
        },
        "verifications": {
          ".write": "auth != null"
        },
        "headingHereNow": {
          ".write": "auth != null"
        }
      }
    },
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid",
        "karma": {
          ".read": true
        }
      }
    }
  }
}
```

### 4. How Real-Time Hooks Work

#### `useRealtimeLocations()` Hook
Listens to all location data in real-time:

```javascript
import { useRealtimeLocations } from './hooks/useRealtimeLocations';

function MyComponent() {
  const { locations, loading, error } = useRealtimeLocations();
  
  if (loading) return <div>Loading locations...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {locations.map(loc => (
        <li key={loc.id}>{loc.name} - {loc.crowdLevel}</li>
      ))}
    </ul>
  );
}
```

#### `useRealtimeUserData(userId)` Hook
Listens to a specific user's karma and profile:

```javascript
import { useRealtimeUserData } from './hooks/useRealtimeLocations';

function UserProfile({ userId }) {
  const { userData, loading, error } = useRealtimeUserData(userId);
  
  if (!userData) return <div>No user data</div>;
  
  return <div>Karma Points: {userData.karma?.points || 0}</div>;
}
```

### 5. Updating Data from Your App

Use the Firebase operations utilities to sync changes:

```javascript
import { 
  updateLocationInFirebase,
  submitLocationReport,
  addUserKarma 
} from './utils/firebaseOperations';

// Submit a crowd report
await submitLocationReport('canteen', {
  waitTime: 20,
  crowdLevel: 'moderate',
  submittedBy: userId
});

// Update location directly
await updateLocationInFirebase('canteen', {
  currentWait: 20,
  crowdLevel: 'moderate'
});

// Add karma to user
await addUserKarma(userId, 10, 'Reported crowd at Canteen');
```

### 6. Testing Real-Time Updates

To test that real-time updates work:

1. Open your app in two browser tabs
2. Update a location in Firebase Console or one tab
3. Watch the other tab update automatically in real-time

You can also monitor data changes in Firebase Console:
- Go to **Realtime Database** → **Data** tab
- Make manual updates and watch them sync across your app

## Features Enabled

✅ **Live Location Updates** - Queue times update in real-time  
✅ **Real-Time Crowd Levels** - See changes instantly across all users  
✅ **User Karma Sync** - Points and activity update live  
✅ **Offline Support** - Falls back to mock data or cached data  
✅ **Automatic Listeners** - Data listeners clean up automatically  

## Troubleshooting

### "No locations data in database" Warning
- Check your Firebase Database URL is correct in `.env.local`
- Ensure your database has the `locations` path set up
- Verify your security rules allow reading locations

### Real-time updates not working
- Check browser console for Firebase errors
- Verify `.env.local` has correct Firebase credentials
- Make sure Realtime Database is enabled in Firebase Console
- Check security rules aren't blocking reads/writes

### localhost testing issues
- If testing locally, you may need to enable CORS in Firebase
- Consider using Firebase Emulator for local development

## Next Steps

1. ✅ Populate your Firebase database with location data
2. ✅ Set up security rules properly
3. ✅ Test real-time updates in development
4. ✅ Integrate user karma updates when users interact
5. ✅ Add analytics to track popular times and locations

## File Structure Added

```
src/
├── hooks/
│   └── useRealtimeLocations.js    # Custom hooks for real-time data
├── utils/
│   └── firebaseOperations.js      # Firebase update utilities
└── firebase.js                     # Updated with database config
```
