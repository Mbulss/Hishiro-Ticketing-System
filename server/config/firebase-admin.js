import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
let serviceAccount;
try {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountEnv) {
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('FIREBASE')));
    serviceAccount = null;
  } else {
    serviceAccount = JSON.parse(serviceAccountEnv);
    console.log('Firebase service account parsed successfully');
  }
} catch (error) {
  console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
  console.log('FIREBASE_SERVICE_ACCOUNT content length:', process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0);
  serviceAccount = null;
}

if (!admin.apps.length) {
  try {
    if (!serviceAccount) {
      console.error('Cannot initialize Firebase Admin: No valid service account found');
      console.error('Please check your FIREBASE_SERVICE_ACCOUNT environment variable');
      // Don't throw error, just log it
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.error('This may cause authentication issues, but server will continue running');
    // Don't throw error to prevent server crash
  }
}

// Function to set admin claims
export const setAdminClaim = async (uid) => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    return true;
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return false;
  }
};

// Function to check if user is admin
export const isAdmin = async (uid) => {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims?.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export default admin; 