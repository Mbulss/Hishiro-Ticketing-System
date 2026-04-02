import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Phone, Clock, CheckCircle, Users, MessageSquare, MapPin, User, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { API_URL } from '../../config/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const { addNotification } = useNotifications();

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch users');
        
        const data = await res.json();
        // Filter to only show regular users (not admins) and exclude invalid test users
        const regularUsers = data.filter(userData => 
          !userData.isAdmin && 
          userData.uid !== 'string' && 
          userData.email !== 'string' &&
          userData.uid !== 'firebase-uid-123' && // Filter out other test users
          userData.uid && // Ensure uid exists
          userData.uid.length > 10 // Firebase UIDs are typically longer than 10 characters
        );
        setUsers(regularUsers);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleDeleteUser = async (userId) => {
    console.log('Attempting to delete user with ID:', userId);
    
    // Enhanced validation for user ID
    if (!userId || userId === 'string' || userId === 'firebase-uid-123' || userId.length < 10) {
      addNotification({
        title: 'Error',
        message: 'Invalid user ID - cannot delete test or invalid users',
        icon: (
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = await user.getIdToken();
      console.log('Making DELETE request to:', `${API_URL}/api/admin/users/${userId}`);
      
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error('Delete failed with status:', res.status, 'Error:', errorData);
        
        // Handle specific Firebase errors
        if (res.status === 500 && errorData.includes('no user record')) {
          throw new Error('User not found in Firebase. This may be a test user that cannot be deleted.');
        }
        
        throw new Error(`Failed to delete user: ${res.status} ${res.statusText}`);
      }

      setUsers(prev => prev.filter(u => (u.uid || u._id) !== userId));
      
      addNotification({
        title: 'Success',
        message: 'User deleted successfully',
        icon: (
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        )
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      addNotification({
        title: 'Error',
        message: err.message,
        icon: (
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">View and manage regular user accounts</p>
        </div>
      </div>

      {/* Users Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Regular Users ({users.length})</h2>
        {users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No users found</h3>
            <p className="text-gray-500">No regular users are currently registered in the system</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((userData) => {
              const userId = userData.uid || userData._id; // Use uid or _id as fallback
              
              return (
                <div
                  key={userId}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 border-2 border-blue-200 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
                          {userData.photoURL ? (
                            <img 
                              src={userData.photoURL} 
                              alt={userData.username || userData.email} 
                              className="h-full w-full object-cover rounded-full"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <img 
                              src={`https://ui-avatars.com/api/?name=${userData.email}&background=dbeafe&color=2563eb`} 
                              alt={userData.username || userData.email}
                              className="h-full w-full object-cover rounded-full"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          )}
                          <div className="text-blue-600 font-semibold hidden">
                            {(userData.username || userData.email)?.[0]?.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{userData.username || userData.email?.split('@')[0]}</h3>
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(userId)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{userData.phone || 'No phone number'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{userData.address || 'No address'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{userData.gender || 'Not specified'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          User
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Joined {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 
