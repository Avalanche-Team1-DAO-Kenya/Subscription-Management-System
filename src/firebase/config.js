import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
};

// Initialize Firebase with error handling
let app;
let db;

try {
  // Log environment variables status (remove in production)
  console.log('Firebase Config Status:', {
    hasApiKey: !!process.env.REACT_APP_FIREBASE_API_KEY,
    hasAuthDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    hasProjectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
    hasStorageBucket: !!process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    hasMessagingSenderId: !!process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    hasAppId: !!process.env.REACT_APP_FIREBASE_APP_ID
  });

  // Validate config before initialization
  const missingKeys = Object.keys(firebaseConfig).filter(key => !firebaseConfig[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase configuration keys: ${missingKeys.join(', ')}`);
  }

  if (!firebaseConfig.projectId) {
    throw new Error('Firebase project ID is required');
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence');
    }
  });

  // Monitor Firestore usage
  if (process.env.NODE_ENV === 'development') {
    console.log('Current environment:', process.env.NODE_ENV);
  }

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.error('Current environment:', process.env.NODE_ENV);
  if (error.code) {
    console.error('Firebase error code:', error.code);
  }
}

export const getDb = () => {
  if (!db) {
    throw new Error('Firebase database not initialized');
  }
  return db;
};

export { db };
