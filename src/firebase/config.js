// ============================================================
//  SAME FIREBASE CONFIG AS CLIENT — use the exact same values
//  Both admin and client connect to the same Firebase project
//  so changes from admin appear instantly on the client website
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCFOMvpiDyQi-fHYkM2VWL5mFcG-VNueCo",
  authDomain: "aurelia-jewellery.firebaseapp.com",
  projectId: "aurelia-jewellery",
  storageBucket: "aurelia-jewellery.firebasestorage.app",
  messagingSenderId: "495857245287",
  appId: "1:495857245287:web:7d7152b5fff21958d888c2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;