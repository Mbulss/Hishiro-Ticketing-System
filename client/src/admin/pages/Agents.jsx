import AdminLayout from '../AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Mail, Phone, Clock, CheckCircle, Users, MessageSquare, MapPin, User, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';

export default function Admins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user) return;
    
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch admin users: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        // Only keep users who are admins
        const adminUsers = data.filter(admin => admin.isAdmin === true);
        setAdmins(adminUsers);
      } catch (err) {
        console.error('Error fetching admin users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, [user]);

  function getStatusColor(status) {
    switch (status) {
      case "Online":
        return "bg-green-100 text-green-800"
      case "Busy":
        return "bg-yellow-100 text-yellow-800"
      case "Offline":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin List</h1>
              <p className="text-muted-foreground">Manage your admin team and their performance</p>
            </div>
          </div>

          {/* Admins Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Admins</h3>
              <p className="text-red-600 mb-4">Error: {error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Admins Found</h3>
              <p className="text-gray-500">No admin users are currently registered in the system</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {admins.map((admin) => (
                <div
                  key={admin.uid || admin._id || admin.email}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarImage src={admin.photoURL ? admin.photoURL : (admin.email ? `https://ui-avatars.com/api/?name=${admin.email}` : "/placeholder-user.jpg")} alt={admin.name || admin.username || admin.email} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(admin.name || admin.username || admin.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{admin.name || admin.username || admin.email?.split('@')[0]}</h3>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{admin.phone || 'No phone number'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{admin.address || 'No address'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{admin.gender || 'Not specified'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="bg-purple-100 text-purple-800">
                          Admin
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  )
} 