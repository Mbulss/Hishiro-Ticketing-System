import { useState, useEffect } from 'react';
import { Header } from "../components/header"
import { Sidebar } from "../components/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Bell, Lock, User, Mail, Phone, Building, Moon, AlertCircle } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import AdminLayout from '../AdminLayout';

export default function Settings() {
  const [user, loading] = useAuthState(auth);
  const [userInfo, setUserInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', gender: '', phone: '', address: '', photoURL: '' });
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (loading) return;
    
    if (!user) return;

    const fetchUserInfo = async () => {
      try {
        setFetchError(null);
        const token = await user.getIdToken();
        
        // Fetch user info
        const userRes = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userRes.ok) {
          throw new Error(`Failed to fetch user info: ${userRes.status} ${userRes.statusText}`);
        }

        const userData = await userRes.json();
        setUserInfo(userData);
        setEditForm({
          username: userData.username || '',
          gender: userData.gender || '',
          phone: userData.phone || '',
          address: userData.address || '',
          photoURL: userData.photoURL || ''
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setFetchError(error.message);
        setUserInfo(null);
      }
    };

    fetchUserInfo();

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user, loading, darkMode]);

  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Only allow JPG and PNG
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG and PNG images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image size should be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm(f => ({ ...f, photoURL: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update profile: ${res.status} - ${errorText}`);
      }
      
      const userRes = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userRes.ok) {
        throw new Error('Failed to fetch updated user data');
      }
      
      const updated = await userRes.json();
      setUserInfo(updated);
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.message);
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Helper function to pick gender icon (only male/female)
  const getGenderIcon = (gender) => {
    if (gender === 'female') return <span className="text-muted-foreground" style={{fontSize: '1.5rem'}}>&#9792;</span>; // ♀
    if (gender === 'male') return <span className="text-muted-foreground" style={{fontSize: '1.5rem'}}>&#9794;</span>; // ♂
    return null;
  };

  if (loading) {
    return (
      <AdminLayout>
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your account settings and preferences</p>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      </AdminLayout>
    );
  }

  if (fetchError) {
    return (
      <AdminLayout>
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your account settings and preferences</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Settings</h3>
              <p className="text-red-600 mb-4">Error: {fetchError}</p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your profile information
                    </CardDescription>
                  </div>
                  {!editMode && (
                    <div className="flex justify-end md:justify-start">
                      <Button onClick={() => setEditMode(true)}>
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-4 space-y-4 sm:space-y-0">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={editMode && editForm.photoURL ? editForm.photoURL : (userInfo?.photoURL || `https://ui-avatars.com/api/?name=${user?.email}`)} alt="Admin" />
                      <AvatarFallback>{userInfo?.username?.[0] || user?.email?.[0] || 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      {editMode ? (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <label htmlFor="photo-upload" className="cursor-pointer">Change Avatar</label>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="photo-upload"
                          />
                        </>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        JPG or PNG. Max size of 2MB.
                      </p>
                    </div>
                  </div>

                  {editMode ? (
                    <form className="grid gap-4 md:grid-cols-2" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                      <div className="space-y-2">
                        <Label htmlFor="username">Full Name</Label>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="username" 
                            name="username"
                            value={editForm.username}
                            onChange={handleEditChange}
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="email" 
                            type="email" 
                            value={user?.email || ''} 
                            disabled 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="phone" 
                            name="phone"
                            value={editForm.phone}
                            onChange={handleEditChange}
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="address" 
                            name="address"
                            value={editForm.address}
                            onChange={handleEditChange}
                            placeholder="Enter your address"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <div className="flex items-center space-x-2">
                          {getGenderIcon(editForm.gender)}
                          <select
                            id="gender"
                            name="gender"
                            value={editForm.gender}
                            onChange={handleEditChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          >
                            <option value="">-</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => {
                            setEditMode(false);
                            setEditForm({
                              username: userInfo?.username || '',
                              gender: userInfo?.gender || '',
                              phone: userInfo?.phone || '',
                              address: userInfo?.address || '',
                              photoURL: userInfo?.photoURL || ''
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-gray-400 mb-1 block">Full Name</Label>
                        <div className="flex items-center space-x-2 min-h-[40px]">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{userInfo?.username || '-'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-gray-400 mb-1 block">Email</Label>
                        <div className="flex items-center space-x-2 min-h-[40px]">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user?.email || '-'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-gray-400 mb-1 block">Phone</Label>
                        <div className="flex items-center space-x-2 min-h-[40px]">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{userInfo?.phone || '-'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-gray-400 mb-1 block">Address</Label>
                        <div className="flex items-center space-x-2 min-h-[40px]">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{userInfo?.address || '-'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-gray-400 mb-1 block">Gender</Label>
                        <div className="flex items-center space-x-2 min-h-[40px]">
                          {getGenderIcon(userInfo?.gender)}
                          <span className="font-medium">{userInfo?.gender || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Update your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {passwordError && (
                      <p className="text-sm text-red-500">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-sm text-green-500">{passwordSuccess}</p>
                    )}

                    <div className="flex justify-end">
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AdminLayout>
  );
} 