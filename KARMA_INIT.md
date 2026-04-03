# 🎯 Zero Karma Initialization Setup

## What Was Done

Your app now automatically initializes **all new users with 0 karma points** when they first join. Here's how it works:

---

## 🔄 How It Works

### 1. **User Signup/Login**
When a user signs up or logs in for the first time:
```
User clicks "Sign Up" or "Log In"
    ↓
Firebase authenticates the user
    ↓
initializeNewUser() is called
    ↓
Checks if user exists in database
    ↓
If NEW: Creates user profile with 0 karma
If EXISTING: Skips initialization
    ↓
User logged in! ✅
```

### 2. **Initial User Data in Firebase**
Every new user starts with this data:
```json
{
  "users": {
    "user-uid-123": {
      "id": "user-uid-123",
      "name": "John Doe",
      "email": "john@example.com",
      "karma": {
        "points": 0,
        "level": "novice"
      },
      "createdAt": "2024-04-03T14:30:00Z",
      "lastActivity": "2024-04-03T14:30:00Z"
    }
  }
}
```

---

## 📁 Files Modified

### 1. **src/utils/firebaseOperations.js** ✏️
Added new function:
```javascript
export const initializeNewUser = async (userId, userData) => {
  // Creates user profile with 0 karma on first login
  // Skips if user already exists
}
```

### 2. **src/components/LoginScreen.jsx** ✏️
Updated login flows:
- **Email Sign Up**: Initializes new user → 0 karma
- **Email Sign In**: Initializes if first time → 0 karma
- **Google Sign In**: Initializes if first time → 0 karma

All three paths now call `initializeNewUser()` after authentication.

---

## ✅ Testing It Out

### Test 1: Create a New Account
1. Go to your app
2. Click "Sign Up"
3. Create new account with email/password
4. Go to Firebase Console → Realtime Database → Data → users
5. **Verify**: New user appears with `karma.points: 0` ✅

### Test 2: Login Existing User
1. Sign out
2. Sign back in with same credentials
3. Go to Firebase Console → Data → users
4. **Verify**: User data is unchanged (no duplicate creation) ✅

### Test 3: Google Sign In
1. Sign out
2. Click "Sign in with Google"
3. Go to Firebase Console → Data → users
4. **Verify**: Google user appears with `karma.points: 0` ✅

---

## 🚀 Next: Increase Karma Points

Later, you can increase karma when users perform actions:

```javascript
import { addUserKarma } from './utils/firebaseOperations';

// When user reports a location:
await addUserKarma(userId, 10, 'Reported crowd at Canteen');

// When user verifies:
await addUserKarma(userId, 5, 'Verified crowd at Canteen');

// When user goes to location:
await addUserKarma(userId, 5, 'Heading to Info Desk');
```

---

## 🔒 Security Notes

- ✅ User can only read/write their own profile data
- ✅ Users cannot modify other users' karma
- ✅ Karma initialization is automatic and protected

---

## 📊 Karma Levels (Optional)

You can expand karma levels later:
```javascript
const KARMA_LEVELS = {
  0: 'novice',
  50: 'contributor',
  100: 'scout',
  200: 'expert',
  500: 'legend',
};
```

---

## 💡 How to Use UID in App

User object now includes `uid`. You can use it like:

```javascript
const { user } = // from App state
console.log(user.uid);  // e.g., "abc123XYZ789"
console.log(user.name); // e.g., "John Doe"

// Pass to functions:
await addUserKarma(user.uid, 5, 'Action description');
```

---

**All set! Every new user now starts with 0 karma! 🎉**