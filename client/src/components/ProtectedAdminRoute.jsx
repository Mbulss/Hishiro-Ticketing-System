import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { API_URL } from '../config/api';
//import { protect, adminMiddleware } from '../middleware/authMiddleware.js';

export default function ProtectedAdminRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const url = `${API_URL}/api/admin/check`;
        console.log('Checking admin status at:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Admin check response:', data);
        
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          console.log('Admin check failed:', data);
          toast.error('You do not have permission to access the admin panel');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Error checking admin status');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!checkingAdmin && !isAdmin && user) {
      toast.error('Access denied. Admin privileges required.');
    }
  }, [checkingAdmin, isAdmin, user]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to admin login page and save the attempted URL
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
} 
