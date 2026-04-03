# 📋 Detailed Real-Time Data Setup Guide - Queue-Jump

## Overview
Your Queue-Jump app is now connected to **Firebase Realtime Database** for live updates of location queues, crowds, and user karma.

---

## ⚠️ IMPORTANT: Security First!

**DO NOT use test mode!** It allows anyone to delete your database. Use these secure rules instead:

### Secure Security Rules (Copy This)
```json
{
  "rules": {
    "locations": {
      ".read": true,
      ".write": false,
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
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```

---

## 📋 Step-by-Step Setup

### **STEP 1: Firebase Console Setup** (5 minutes)

#### 1.1 Go to Firebase Console
- Open https://console.firebase.google.com/
- Select your **queue-jump** project

#### 1.2 Enable Realtime Database
1. In the left sidebar, find **Build** section
2. Click on **Realtime Database**
3. Click **Create Database**
4. Choose:
   - **Location**: Select closest to you (e.g., `us-central1`)
   - **Security Rules**: Choose **Start in locked mode** (we'll add proper rules)
5. Click **Enable**

#### 1.3 Copy Your Database URL
1. In Realtime Database tab, go to **Data** tab (top)
2. At the top, you'll see a URL like: `https://queue-jump-xxxxx.firebaseio.com/`
3. **Copy this URL** - you'll need it next

---

### **STEP 2: Update Environment Variables** (2 minutes)

#### 2.1 Open `.env.local` in your project
Location: `c:\Users\Prataya Ghosh\OneDrive\Attachments\Documents\Tech Fest\queue-jump\.env.local`

#### 2.2 Add the database URL
```env
VITE_FIREBASE_API_KEY=your_existing_api_key
VITE_AUTH_DOMAIN=your_existing_auth_domain
VITE_PROJECT_ID=your_existing_project_id
VITE_STORAGE_BUCKET=your_existing_storage_bucket
VITE_MESSAGING_SENDER_ID=your_existing_messaging_sender_id
VITE_APP_ID=your_existing_app_id
VITE_DATABASE_URL=https://queue-jump-xxxxx.firebaseio.com
```

> **Note**: Keep all your existing Firebase config values, just add the new `VITE_DATABASE_URL` line

---

### **STEP 3: Set Up Database Structure** (10 minutes)

#### 🎯 Option A: Import JSON (RECOMMENDED - Easiest)
1. In Firebase console, go to **Realtime Database** → **Data** tab
2. Click the **⋮** (three dots) menu in the top-right
3. Click **Import JSON**
4. Copy and paste this complete JSON:

```json
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
      "lastUpdated": "2024-04-03T14:30:00Z"
    },
    "infodesk": {
      "id": "infodesk",
      "name": "Info Desk",
      "icon": "ℹ️",
      "category": "campus",
      "x": 50,
      "y": 50,
      "currentWait": 5,
      "crowdLevel": "empty",
      "reports": 12,
      "verifications": 3,
      "headingHereNow": 0,
      "lastUpdated": "2024-04-03T14:20:00Z"
    },
    "aiShowcase": {
      "id": "aiShowcase",
      "name": "AI Showcase",
      "icon": "🤖",
      "category": "fest",
      "x": 60,
      "y": 40,
      "currentWait": 45,
      "crowdLevel": "packed",
      "reports": 18,
      "verifications": 8,
      "headingHereNow": 12,
      "lastUpdated": "2024-04-03T14:25:00Z"
    }
  },
  "users": {
    "sample_user_1": {
      "id": "sample_user_1",
      "name": "John Doe",
      "email": "john@example.com",
      "karma": {
        "points": 125,
        "level": "scout"
      },
      "lastActivity": "2024-04-03T14:30:00Z"
    }
  }
}
```

5. Click **Import** - all data will be added at once!

#### 🔧 Option B: Manual Entry (If Import Doesn't Work)
If the JSON import fails, add data manually:

1. Click the **+** button next to the root
2. **Name**: `locations`, **Value**: (leave empty, click **+** to add sub-items)
3. Under `locations`, click **+** again
4. **Name**: `canteen`, **Value**: (leave empty)
5. Under `canteen`, add each field:
   - **Name**: `id`, **Value**: `"canteen"`
   - **Name**: `name`, **Value**: `"Canteen"`
   - **Name**: `icon`, **Value**: `"🍔"`
   - **Name**: `category`, **Value**: `"campus"`
   - **Name**: `x`, **Value**: `25` (number, no quotes)
   - **Name**: `y`, **Value**: `30` (number, no quotes)
   - **Name**: `currentWait`, **Value**: `15` (number)
   - **Name**: `crowdLevel`, **Value**: `"moderate"`
   - **Name**: `reports`, **Value**: `24` (number)
   - **Name**: `verifications`, **Value**: `5` (number)
   - **Name**: `headingHereNow`, **Value**: `3` (number)
   - **Name**: `lastUpdated`, **Value**: `"2024-04-03T14:30:00Z"`

6. Repeat for other locations (`infodesk`, `aiShowcase`)
7. Add `users` section the same way

**Note**: Numbers don't need quotes, strings do need quotes.

---

### **STEP 4: Configure Security Rules** (5 minutes)

#### 4.1 Go to Database Security Rules
1. In Realtime Database, click **Rules** tab (not Data)
2. **Replace everything** with the secure rules from the top of this guide
3. Click **Publish**

**What these rules mean:**
- ✅ Anyone can READ all locations (real-time crowd data)
- ✅ Only authenticated users can UPDATE location data
- ✅ Users can only read/write their own profile

---

### **STEP 5: Test Your Setup** (5 minutes)

#### 5.1 Start Your Development Server
Open terminal in your project folder:
```powershell
npm run dev
```

#### 5.2 Open Your App
- Go to `http://localhost:5173` (or the URL shown)
- Login with your test account
- Check the browser console (F12) for any errors

#### 5.3 Look for "LIVE" Indicator
- If setup is correct, you should see the **LIVE** indicator in the top-right
- Queue times should come from Firebase instead of mock data

#### 5.4 Real-Time Test (Optional)
1. Open your app in **two browser tabs**
2. In Firebase console, go to **Realtime Database** → **Data**
3. Click on `locations` → `canteen` → `currentWait`
4. Edit the value (e.g., change from 15 to 30)
5. **Watch both app tabs update automatically!** ✨

---

## 🔧 Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| **"VITE_DATABASE_URL is undefined"** | Check `.env.local` has correct URL, restart dev server |
| **"Permission denied" error** | Check security rules are published, verify auth rules |
| **Data not updating in real-time** | Check browser console for errors, verify Firebase connection |
| **See mock data, not Firebase data** | Database path might be wrong, check `locations` exists in Firebase |
| **Only see loading spinner** | Check `.env.local` variables and internet connection |
| **JSON import fails** | Use manual entry method instead |

---

## ✅ Quick Verification Checklist

After completing all steps, verify:
- [ ] `.env.local` has `VITE_DATABASE_URL`
- [ ] Firebase Realtime Database is created
- [ ] Database has `locations` and `users` structure
- [ ] Security rules are published (not test mode)
- [ ] Dev server shows no errors in console
- [ ] "LIVE" indicator appears in app
- [ ] Locations display from Firebase (not mock data)
- [ ] Real-time updates work (test with 2 tabs)

---

## 🚀 Next Steps After Testing

Once basic real-time is working:

1. **Connect user karma updates** - Save karma points to Firebase when users interact
2. **Add admin panel** - Edit location data from your app
3. **Set up analytics** - Track which times/places are busiest
4. **Enable offline mode** - App still works if internet drops
5. **Deploy to Firebase Hosting** - Make it accessible online

---

**Need help? Check the browser console (F12) for specific error messages - they usually explain what's wrong!**