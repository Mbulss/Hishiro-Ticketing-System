import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Link, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Bell, Search, Shield, Settings, LogOut, Menu, ChevronDown, User } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../firebase'
import { signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import NotificationBell from '../../components/NotificationBell'
import { useNotifications } from '../../contexts/NotificationContext'
import logo from '../../assets/logo.png';
import { io } from 'socket.io-client'
import { getSocketUrl, API_URL } from '../../config/api'

export function Header({ onMenuClick }) {
  const [user] = useAuthState(auth)
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, getNotificationIcon, addNotification } = useNotifications()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data)
      } catch (err) {
        setProfile(null)
      }
    }
    fetchProfile()
  }, [user])

  // Real-time admin notifications
  useEffect(() => {
    if (!user) return;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('Admin socket connected');
      // Join admin notification room
      socket.emit('adminJoinNotificationRoom', user.uid);
    });

    // Listen for new tickets created by users
    socket.on('newTicketCreated', (data) => {
      addNotification({
        title: '🎫 New Ticket Created',
        message: `${data.userName} created a new ${data.priority} priority ticket: "${data.ticketSubject}"`,
        type: 'ticket',
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject,
        priority: data.priority
      });

      // Browser notification for admins
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('🎫 New Support Ticket', {
          body: `${data.userName} needs help: "${data.ticketSubject}"`,
          icon: '/favicon.ico',
          tag: `new-ticket-${data.ticketId}`,
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          navigate(`/admin/tickets/${data.ticketId}`);
          notification.close();
        };
      }
    });

    // Listen for urgent tickets
    socket.on('urgentTicketAlert', (data) => {
      addNotification({
        title: '🚨 Urgent Ticket Alert',
        message: `High priority ticket from ${data.userName}: "${data.ticketSubject}"`,
        type: 'alert',
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject
      });

      // Browser notification for urgent tickets
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('🚨 URGENT: High Priority Ticket', {
          body: `${data.userName}: "${data.ticketSubject}"`,
          icon: '/favicon.ico',
          tag: `urgent-ticket-${data.ticketId}`,
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          navigate(`/admin/tickets/${data.ticketId}`);
          notification.close();
        };
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, addNotification, navigate]);

  // Request notification permission for admins
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success('Signed out successfully')
      navigate('/admin/login')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffInHours = Math.floor((now - then) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return then.toLocaleDateString()
  }

  return (
    <>
      <header className="bg-white/70 backdrop-blur-md shadow-xl border-b flex items-center relative h-16 px-2 sm:px-4">
        {/* Hamburger (mobile) */}
        <div className="flex items-center">
          <button
            className="block xl:hidden p-2 rounded hover:bg-gray-200 focus:outline-none mr-2"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
        {/* Centered Logo */}
        <div className="hidden xl:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Link to="/admin">
            <img src={logo} alt="Logo" className="h-10 drop-shadow-xl" />
          </Link>
        </div>
        {/* Right: Notification, Avatar, Welcome */}
        <div className="ml-auto flex items-center space-x-4">
          <button
            onClick={() => setShowNotificationsPanel(true)}
            className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none z-50"
          >
            <Bell className="h-6 w-6 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border-2 border-primary">
                  <AvatarImage src={profile?.photoURL ? profile.photoURL : (user?.photoURL ? user.photoURL : (user?.email ? `https://ui-avatars.com/api/?name=${user.email}` : "/placeholder-user.jpg"))} alt="Admin" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8 border-2 border-primary">
                      <AvatarImage src={profile?.photoURL ? profile.photoURL : (user?.photoURL ? user.photoURL : (user?.email ? `https://ui-avatars.com/api/?name=${user.email}` : "/placeholder-user.jpg"))} alt="Admin" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{user?.displayName || 'Admin User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || 'admin@company.com'}</p>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Welcome message */}
          <span className="hidden sm:inline text-lg font-semibold text-gray-800 ml-2">
            {`Welcome, ${profile?.username || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin')}`}
          </span>
        </div>

        {/* Notification Drawer */}
        {showNotificationsPanel && createPortal(
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[999] bg-black/30"
              onClick={() => setShowNotificationsPanel(false)}
            />
            {/* Drawer */}
            <div
              className="fixed z-[9999] right-0 bg-white shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right"
              style={{
                top: '64px',
                height: 'calc(100vh - 64px)',
                width: '100%',
                maxWidth: '28rem',
              }}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <button onClick={() => setShowNotificationsPanel(false)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length > 0 ? (
                  <>
                    {unreadCount > 0 && (
                      <div className="p-4 border-b flex justify-end">
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Mark all as read
                        </button>
                      </div>
                    )}
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          markAsRead(notification.id);
                          // Navigate to ticket if ticketId is available
                          if (notification.ticketId) {
                            navigate(`/admin/tickets/${notification.ticketId}`);
                            setShowNotificationsPanel(false);
                          }
                        }}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-all duration-200 ${!notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-500">{notification.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400">{formatTimeAgo(notification.timestamp)}</p>
                              {notification.ticketSubject && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                  {notification.ticketSubject.length > 20 
                                    ? `${notification.ticketSubject.substring(0, 20)}...` 
                                    : notification.ticketSubject}
                                </span>
                              )}
                              {notification.priority && (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  notification.priority === 'high' 
                                    ? 'bg-red-100 text-red-700' 
                                    : notification.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {notification.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-500">No notifications</div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
      </header>
    </>
  )
} 