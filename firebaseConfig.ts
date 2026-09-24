// Connects the app to the Firebase project and its Realtime Database. These
// values come from the Firebase project settings.

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA29W_9UbbJgIM8sdVfBZsL03cnC4bxQps",
  authDomain: "tiltionary.firebaseapp.com",
  databaseURL: "https://tiltionary-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tiltionary",
  storageBucket: "tiltionary.firebasestorage.app",
  messagingSenderId: "370991961325",
  appId: "1:370991961325:web:0069cb40f915ac08c028e4"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);