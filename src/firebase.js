import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgtTOOqCM1171OYqQv2OfegvzgBSdPpUk",
  authDomain: "queue-jump-78548.firebaseapp.com",
  projectId: "queue-jump-78548",
  storageBucket: "queue-jump-78548.firebasestorage.app",
  messagingSenderId: "266284492127",
  appId: "1:266284492127:web:a4cfa65f999f0f524e82ea",
  measurementId: "G-KCRJ9FGZ3P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
