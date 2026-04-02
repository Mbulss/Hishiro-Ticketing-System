import admin from '../config/firebase-admin.js';
import { supabase } from '../config/supabase.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Check if Firebase Admin is properly initialized
      if (!admin.apps.length) {
        console.error('Firebase Admin not initialized');
        res.status(500).json({ message: 'Authentication service unavailable', error: 'FIREBASE_NOT_INITIALIZED' });
        return;
      }

      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Received token:', token.substring(0, 50) + '...');
      
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Firebase token verified successfully for UID:', decodedToken.uid);
      console.log('Token details:', { 
        email: decodedToken.email, 
        name: decodedToken.name,
        project: decodedToken.aud // This should be "testing-59e97"
      });
      
      // Get user from database using Firebase UID (Supabase)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', decodedToken.uid)
        .single();

      let finalUser = user;

      if (userError && userError.code === 'PGRST116') { // PGRST116 is "No rows found"
        console.log('User not found in Supabase, creating new user record');
        
        // Get user info from Firebase
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);
        
        // Create user in Supabase
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              uid: decodedToken.uid,
              email: firebaseUser.email,
              username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              auth_provider: 'firebase',
              is_admin: false
            }
          ])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating user in Supabase:', createError);
          throw createError;
        }
        
        finalUser = newUser;
        console.log('New user created in Supabase:', finalUser);
      } else if (userError) {
        console.error('Error fetching user from Supabase:', userError);
        throw userError;
      } else {
        console.log('Found existing user in Supabase:', finalUser.email);
      }

      req.user = finalUser;
      req.decodedToken = decodedToken; // Also pass the decoded token
      next();
    } catch (error) {
      console.error('Auth error details:', error);
      if (error.code === 'auth/id-token-expired') {
        console.error('Token expired');
        res.status(401).json({ message: 'Token expired', error: 'TOKEN_EXPIRED' });
      } else if (error.code === 'auth/invalid-id-token') {
        console.error('Invalid token');
        res.status(401).json({ message: 'Invalid token', error: 'INVALID_TOKEN' });
      } else if (error.code === 'auth/project-not-found') {
        console.error('Firebase project mismatch');
        res.status(401).json({ message: 'Project configuration error', error: 'PROJECT_MISMATCH' });
      } else {
        res.status(401).json({ message: 'Authentication failed', error: error.message });
      }
      return;
    }
  } else {
    console.log('No authorization header found');
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

export { protect, adminMiddleware }; 