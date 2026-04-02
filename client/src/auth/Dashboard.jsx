import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, logout } from "../firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  EyeIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/logo.png";
import NotificationBell from '../components/NotificationBell';
import { useNotifications } from '../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Bell, Lock, User, Mail, Phone, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Select } from "../components/ui/select";
import { toast } from 'react-hot-toast';
import { io } from "socket.io-client";
import { API_URL, getSocketUrl } from '../config/api';

export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [userInfo, setUserInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', gender: '', phone: '', address: '', photoURL: '' });
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const { notifications, unreadCount, markAsRead, markAllAsRead, getNotificationIcon, addNotification } = useNotifications();
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ 
    title: '', 
    description: '',
    priority: 'Low',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wordCount, setWordCount] = useState(0);
  const [descriptionError, setDescriptionError] = useState('');

  useEffect(() => {
    if (showNotificationsPanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNotificationsPanel]);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate("/login");
      return;
    }

    // Add this temporary function to get the token
    const getTokenID = async () => {
      const token = await user.getIdToken();
      console.log('Your Firebase ID token:', token);
    };
    getTokenID();

    // Check if user is admin and redirect if so
    const checkAdmin = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = API_URL;
        const url = `${apiUrl}/api/admin/check`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.isAdmin) {
            navigate('/admin');
            return;
          }
        }
      } catch (err) {
        // ignore error, treat as not admin
      }
    };
    checkAdmin();

    // Get the Firebase ID token
    const getToken = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = API_URL;
        
        // Fetch user's tickets
        const ticketsRes = await fetch(`${apiUrl}/api/tickets/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!ticketsRes.ok) {
          if (ticketsRes.status === 401) {
            navigate("/login");
            return;
          }
          throw new Error('Failed to fetch tickets');
        }
        
        const ticketsData = await ticketsRes.json();
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);

        // Fetch user info
        const userRes = await fetch(`${apiUrl}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userRes.ok) {
          if (userRes.status === 401) {
            navigate("/login");
            return;
          }
          throw new Error('Failed to fetch user info');
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
        console.error('Error fetching data:', error);
        setTickets([]);
        setUserInfo(null);
      }
    };

    getToken();

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user, loading, navigate, darkMode]);

  // Real-time notifications for ticket updates
  useEffect(() => {
    if (!user) return;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('Dashboard socket connected');
      // Join user-specific room for notifications
      socket.emit('userJoinNotificationRoom', user.uid);
    });

    // Listen for admin replies to user's tickets
    socket.on('adminReplyToUserTicket', (data) => {
      addNotification({
        title: '💬 New Reply from Support',
        message: `Admin replied to ticket "${data.ticketSubject}": "${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
        type: 'message',
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject
      });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('💬 New Reply from Support', {
          body: `Admin replied to: "${data.ticketSubject}"`,
          icon: '/favicon.ico',
          tag: `ticket-reply-${data.ticketId}`,
          requireInteraction: false
        });

        setTimeout(() => notification.close(), 5000);

        notification.onclick = () => {
          window.focus();
          navigate(`/ticket/${data.ticketId}`);
          notification.close();
        };
      }
    });

    // Listen for ticket status updates
    socket.on('userTicketStatusUpdated', (data) => {
      const statusEmojis = {
        'new': '🆕',
        'in-progress': '⏳',
        'resolved': '✅',
        'closed': '🔒'
      };

      addNotification({
        title: `${statusEmojis[data.status] || '📋'} Ticket Status Updated`,
        message: `Ticket "${data.ticketSubject}" status changed to: ${data.status}`,
        type: 'status',
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject
      });

      // Refresh tickets if on tickets tab
      if (activeTab === 'tickets') {
        fetchTickets();
      }
    });

    // Listen for ticket priority updates
    socket.on('userTicketPriorityUpdated', (data) => {
      const priorityEmojis = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🔴'
      };

      addNotification({
        title: `${priorityEmojis[data.priority] || '⚡'} Priority Updated`,
        message: `Ticket "${data.ticketSubject}" priority changed to: ${data.priority}`,
        type: 'priority',
        ticketId: data.ticketId,
        ticketSubject: data.ticketSubject
      });

      // Refresh tickets if on tickets tab
      if (activeTab === 'tickets') {
        fetchTickets();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, addNotification, navigate, activeTab]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (loading) {
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
    return null;
  }

  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  // Handle profile picture upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Only allow JPG and PNG
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG and PNG images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('Image size should be less than 2MB.');
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
      const apiUrl = API_URL;
      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      // Re-fetch user info to ensure latest data (especially photoURL)
      const userRes = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = await userRes.json();
      setUserInfo(updated);
      setEditMode(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Initialize stats with empty array if tickets is not an array
  const stats = {
    total: Array.isArray(tickets) ? tickets.length : 0,
    open: Array.isArray(tickets) ? tickets.filter((t) => t.status === "open").length : 0,
    inProgress: Array.isArray(tickets) ? tickets.filter((t) => t.status === "in-progress").length : 0,
    resolved: Array.isArray(tickets) ? tickets.filter((t) => t.status === "resolved").length : 0,
  };

  const menuItems = [
    { id: "home", label: "Home", icon: HomeIcon, action: () => { navigate('/'); setShowSidebar(false); } },
    { id: "overview", label: "Overview", icon: UserCircleIcon },
    { id: "tickets", label: "My Tickets", icon: TicketIcon },
    { id: "open-tickets", label: "Open Tickets", icon: ChatBubbleLeftRightIcon },
    { id: "in-progress", label: "In Progress", icon: ArrowPathIcon },
    { id: "resolved", label: "Resolved", icon: CheckCircleIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "settings", label: "Settings", icon: Cog6ToothIcon },
  ];

  // Helper function to pick gender icon (only male/female)
  const getGenderIcon = (gender) => {
    if (gender === 'female') return <span className="text-muted-foreground" style={{fontSize: '1.5rem'}}>&#9792;</span>; // ♀
    if (gender === 'male') return <span className="text-muted-foreground" style={{fontSize: '1.5rem'}}>&#9794;</span>; // ♂
    return null;
  };

  const handleNewTicketChange = (e) => {
    const { name, value } = e.target;
    
    // Handle word counting for description
    if (name === 'description') {
      const words = value.trim().split(/\s+/).filter(word => word.length > 0);
      const count = value.trim() === '' ? 0 : words.length;
      setWordCount(count);
      
      if (count > 0 && count < 15) {
        setDescriptionError('Description must be at least 15 words');
      } else {
        setDescriptionError('');
      }
    }
    setNewTicket((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewTicketSubmit = async (e) => {
    e.preventDefault();
    if (wordCount < 15) {
      setDescriptionError('Description must be at least 15 words');
      toast.error('Please provide more details. Your description needs at least 15 words to help us better understand your issue.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const apiUrl = API_URL;
      const res = await fetch(`${apiUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          message: newTicket.description,
          subject: newTicket.title,
          priority: newTicket.priority.toLowerCase(),
          botResponse: "No bot response",
        }),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const created = await res.json();
      setTickets((prev) => [created, ...prev]);
      setShowNewTicketForm(false);
      setNewTicket({ title: '', description: '', priority: 'Low' });
      setWordCount(0);
      setDescriptionError('');
      toast.success('Ticket created successfully! We will review it shortly.');
    } catch (err) {
      toast.error('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket._id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Your Dashboard</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Tickets</p>
                    <p className="text-2xl font-semibold">{stats.total}</p>
                  </div>
                  <TicketIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Open Tickets</p>
                    <p className="text-2xl font-semibold">{stats.open}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">In Progress</p>
                    <p className="text-2xl font-semibold">{stats.inProgress}</p>
                  </div>
                  <ArrowPathIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Resolved</p>
                    <p className="text-2xl font-semibold">{stats.resolved}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              {tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.slice(0, 5).map((ticket) => (
                    <div
                      key={ticket._id}
                      className="bg-white rounded-xl shadow p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-lg">
                            {ticket.priority === "high"
                              ? "🔴"
                              : ticket.priority === "medium"
                              ? "🟡"
                              : "🟢"}
                          </span>
                          <div>
                            <div className="font-bold text-lg">{ticket.subject || ticket.message}</div>
                            <div className="text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2
                          ${ticket.status === "resolved"
                            ? "border-green-500 text-green-700 bg-white"
                            : ticket.status === "in-progress"
                            ? "border-blue-500 text-blue-700 bg-white"
                            : ticket.status === "closed"
                            ? "border-zinc-400 text-zinc-700 bg-white"
                            : "border-purple-500 text-purple-700 bg-white" // default for 'new'
                          }`}>
                          {ticket.status === "resolved" ? "Resolved"
                            : ticket.status === "in-progress" ? "In Progress"
                            : ticket.status === "closed" ? "Closed"
                            : "Open"}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm">{ticket.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400">
                          Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4 inline-block" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        );

      case "tickets":
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{showNewTicketForm ? 'New Ticket' : 'My Tickets'}</div>
              {!showNewTicketForm && (
                <Button onClick={() => setShowNewTicketForm(true)} className="bg-black text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-900 transition-all duration-150">
                  New Ticket
                </Button>
              )}
            </div>
            {/* Filters and Search */}
            {!showNewTicketForm && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full sm:w-1/3"
                />
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full sm:w-1/6"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full sm:w-1/6"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
            {showNewTicketForm ? (
              <form onSubmit={handleNewTicketSubmit} className="bg-white rounded-xl shadow p-6 space-y-4 mb-6">
                <div>
                  <Label className="block mb-1 font-medium">Issue Title</Label>
                  <Input name="title" value={newTicket.title} onChange={handleNewTicketChange} required placeholder="Enter issue title" />
                </div>
                <div>
                  <Label className="block mb-1 font-medium">Description of the Problem</Label>
                  <textarea 
                    name="description" 
                    value={newTicket.description} 
                    onChange={handleNewTicketChange} 
                    required 
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-black/30 resize-none ${descriptionError ? 'border-red-500' : ''}`} 
                    rows={5} 
                    placeholder="Describe your problem in detail (minimum 15 words)..." 
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-sm ${descriptionError ? 'text-red-500' : 'text-gray-500'}`}>
                      {descriptionError || `${wordCount}/15 words minimum`}
                    </span>
                    <span className="text-sm text-gray-500">{wordCount} words</span>
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">ℹ️ Note:</span> Your ticket will be automatically categorized and prioritized by our support team based on the content you provide.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowNewTicketForm(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-black text-white" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Button>
                </div>
              </form>
            ) : (
              filteredTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      className="bg-white rounded-xl shadow p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-lg">
                            {ticket.priority === "high"
                              ? "🔴"
                              : ticket.priority === "medium"
                              ? "🟡"
                              : "🟢"}
                          </span>
                          <div>
                            <div className="font-bold text-lg">{ticket.subject || ticket.message}</div>
                            <div className="text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2
                          ${ticket.status === "resolved"
                            ? "border-green-500 text-green-700 bg-white"
                            : ticket.status === "in-progress"
                            ? "border-blue-500 text-blue-700 bg-white"
                            : ticket.status === "pending"
                            ? "border-orange-500 text-orange-700 bg-white"
                            : "border-blue-500 text-blue-700 bg-white" // default for 'open'
                          }`}>
                          {ticket.status === "resolved" ? "Resolved"
                            : ticket.status === "in-progress" ? "In Progress"
                            : ticket.status === "pending" ? "Pending"
                            : "Open"}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm">{ticket.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400">
                          Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4 inline-block" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No tickets found</p>
              )
            )}
          </div>
        );

      case "open-tickets":
        const openTickets = tickets.filter(ticket => ticket.status === "open");
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Open Tickets</div>
                <p className="text-gray-500">Open tickets that need attention</p>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Search open tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/3"
              />
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/6"
              >
                <option value="all">All Priorities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Tickets List */}
            {openTickets.length > 0 ? (
              <div className="space-y-4">
                {openTickets
                  .filter(ticket => {
                    const matchesSearch =
                      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket._id?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesPriority =
                      priorityFilter === "all" || ticket.priority === priorityFilter;
                    return matchesSearch && matchesPriority;
                  })
                  .map((ticket) => (
                    <div key={ticket._id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-lg">
                            {ticket.priority === "high" ? "🔴" : ticket.priority === "medium" ? "🟡" : "🟢"}
                          </span>
                          <div>
                            <div className="font-bold text-lg">{ticket.subject || ticket.message}</div>
                            <div className="text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold border-2 border-blue-500 text-blue-700 bg-white">
                          Open
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm">{ticket.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400">
                          Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4 inline-block" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No open tickets</h4>
                <p className="text-gray-500">All your tickets have been taken care of!</p>
              </div>
            )}
          </div>
        );

      case "in-progress":
        const inProgressTickets = tickets.filter(ticket => ticket.status === "in-progress");
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">In Progress Tickets</div>
                <p className="text-gray-500">Tickets that are currently being worked on</p>
              </div>
            </div>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Search in progress tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/3"
              />
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/6"
              >
                <option value="all">All Priorities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            {/* Tickets List */}
            {inProgressTickets.length > 0 ? (
              <div className="space-y-4">
                {inProgressTickets
                  .filter(ticket => {
                    const matchesSearch =
                      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket._id?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesPriority =
                      priorityFilter === "all" || ticket.priority === priorityFilter;
                    return matchesSearch && matchesPriority;
                  })
                  .map((ticket) => (
                    <div key={ticket._id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-lg">
                            {ticket.priority === "high" ? "🔴" : ticket.priority === "medium" ? "🟡" : "🟢"}
                          </span>
                          <div>
                            <div className="font-bold text-lg">{ticket.subject || ticket.message}</div>
                            <div className="text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold border-2 border-blue-500 text-blue-700 bg-white">
                          In Progress
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm">{ticket.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400">
                          Updated: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4 inline-block" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No in progress tickets</h4>
                <p className="text-gray-500">You don't have any tickets currently in progress.</p>
              </div>
            )}
          </div>
        );

      case "resolved":
        const resolvedTickets = tickets.filter(ticket => ticket.status === "resolved" || ticket.status === "closed");
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Resolved Tickets</div>
                <p className="text-gray-500">Tickets that have been resolved or closed</p>
              </div>
              <Button onClick={() => setActiveTab('tickets')} variant="outline" className="font-semibold px-4 py-2 rounded-lg shadow transition-all duration-150">
                View All Tickets
              </Button>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Search resolved tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/3"
              />
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-1/6"
              >
                <option value="all">All Priorities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Tickets List */}
            {resolvedTickets.length > 0 ? (
              <div className="space-y-4">
                {resolvedTickets
                  .filter(ticket => {
                    const matchesSearch =
                      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ticket._id?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesPriority =
                      priorityFilter === "all" || ticket.priority === priorityFilter;
                    return matchesSearch && matchesPriority;
                  })
                  .map((ticket) => (
                    <div key={ticket._id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-lg">
                            {ticket.priority === "high" ? "🔴" : ticket.priority === "medium" ? "🟡" : "🟢"}
                          </span>
                          <div>
                            <div className="font-bold text-lg">{ticket.subject || ticket.message}</div>
                            <div className="text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2
                          ${ticket.status === "resolved"
                            ? "border-green-500 text-green-700 bg-white"
                            : "border-gray-500 text-gray-700 bg-white"
                          }`}>
                          {ticket.status === "resolved" ? "Resolved" : "Closed"}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm">{ticket.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400">
                          Completed: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4 inline-block" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No resolved tickets</h4>
                <p className="text-gray-500">You don't have any resolved or closed tickets yet.</p>
              </div>
            )}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Notifications</h3>
                <p className="text-gray-500">Stay updated with your latest activities</p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button onClick={markAllAsRead} variant="outline" size="sm">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <BellIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{notifications.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unread</CardTitle>
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Read</CardTitle>
                  <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">
                                  {notification.title}
                                </h4>
                                <p className="text-gray-600 text-sm mb-2">
                                  {notification.message}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </span>
                              </div>
                              {!notification.read && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h4>
                    <p className="text-gray-500">We'll notify you when something important happens.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Settings</h3>
            <p className="text-muted-foreground mb-4">Manage your account settings and preferences</p>
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
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage
                          src={editMode && editForm.photoURL ? editForm.photoURL : (userInfo?.photoURL ? userInfo.photoURL : `https://ui-avatars.com/api/?name=${user.email}`)}
                          alt="User"
                        />
                        <AvatarFallback>{user.displayName?.[0] || userInfo?.username?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        {editMode ? (
                          <Button variant="outline" size="sm" asChild>
                            <label htmlFor="profile-pic-upload-user" className="cursor-pointer">Change Avatar</label>
                          </Button>
                        ) : null}
                        <input
                          id="profile-pic-upload-user"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
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
                            <Input id="username" name="username" value={editForm.username} onChange={handleEditChange} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Input id="email" type="email" value={userInfo?.email || user.email} disabled />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Input id="phone" name="phone" value={editForm.phone} onChange={handleEditChange} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <Input id="address" name="address" value={editForm.address} onChange={handleEditChange} />
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
                        <div className="md:col-span-2 flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => { setEditMode(false); setEditForm({ username: userInfo?.username || '', gender: userInfo?.gender || '', phone: userInfo?.phone || '', address: userInfo?.address || '', photoURL: userInfo?.photoURL || '' }); }}>Cancel</Button>
                          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 mb-1 block">Full Name</Label>
                          <div className="flex items-center space-x-2 min-h-[40px]">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userInfo?.username || user.displayName || '-'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 mb-1 block">Email</Label>
                          <div className="flex items-center space-x-2 min-h-[40px]">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userInfo?.email || user.email}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 mb-1 block">Phone</Label>
                          <div className="flex items-center space-x-2 min-h-[40px]">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userInfo?.phone || '-'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 mb-1 block">Address</Label>
                          <div className="flex items-center space-x-2 min-h-[40px]">
                            <Building className="h-8 w-8 text-muted-foreground" />
                            <span className="font-medium">{userInfo?.address || '-'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400 mb-1 block">Gender</Label>
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
                      Manage your password and security preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form
                      className="space-y-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setPasswordError('');
                        setPasswordSuccess('');
                        if (newPassword !== confirmPassword) {
                          setPasswordError('New passwords do not match.');
                          return;
                        }
                        setPasswordLoading(true);
                        try {
                          // Re-authenticate with current password
                          const credential = EmailAuthProvider.credential(user.email, currentPassword);
                          await reauthenticateWithCredential(user, credential);
                          // Now update password
                          await updatePassword(user, newPassword);
                          setPasswordSuccess('Password updated successfully!');
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        } catch (err) {
                          setPasswordError(err.message);
                        } finally {
                          setPasswordLoading(false);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="flex items-center space-x-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
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
                            onChange={e => setNewPassword(e.target.value)}
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
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      {passwordError && <div className="text-red-500">{passwordError}</div>}
                      {passwordSuccess && <div className="text-green-600">{passwordSuccess}</div>}
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
        );

      default:
        return null;
    }
  };

  // Debug: log activeTab to ensure it's always a string
  console.log('Sidebar activeTab:', activeTab);
  console.log('userInfo:', userInfo);

  return (
    <div className="dashboard-page min-h-screen w-full bg-gray-50 flex flex-col font-sans" style={{ minHeight: '100vh', height: 'auto', overflowX: 'hidden' }}>
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-xl py-4 px-2 sm:py-6 sm:px-0 rounded-b-2xl border-b border-gray-200 flex items-center relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full relative">
          {/* Left: Hamburger */}
          <div className="flex items-center">
            <button
              className="block xl:hidden p-2 rounded hover:bg-gray-200 focus:outline-none mr-2"
              onClick={() => setShowSidebar(true)}
              aria-label="Open sidebar"
              style={{ position: 'relative' }}
            >
              <Bars3Icon className="h-7 w-7 text-gray-700" />
            </button>
          </div>
          {/* Center: Logo (absolutely centered) */}
          <div className="hidden xl:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Link to="/" className="transition-transform duration-200 hover:scale-105">
              <img src={logo} alt="Logo" className="h-12 sm:h-14 drop-shadow-xl cursor-pointer" />
            </Link>
          </div>
          {/* Right: Notification and Welcome */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell triggers right-side panel */}
            <button
              onClick={() => setShowNotificationsPanel(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
            >
              <Bell className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <img
                    src={userInfo?.photoURL ? userInfo.photoURL : `https://ui-avatars.com/api/?name=${userInfo?.username || user.email}`}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-gray-200 shadow object-cover cursor-pointer"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                    Go to Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }} className="text-red-600">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="font-medium">{userInfo?.username || user?.displayName || user?.email?.split('@')[0]}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8 mb-4 sm:mb-8" style={{ minHeight: 0 }}>
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4 sm:py-6">
          <div className="text-center sm:text-left w-full">
            <div className="mb-2 text-lg font-medium text-gray-700">
              Welcome, <span className="font-bold">{userInfo?.username || user?.displayName || user?.email?.split('@')[0] || 'User'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-1 flex items-center gap-2 justify-center sm:justify-start">
              Your Dashboard
            </h1>
            <p className="text-gray-500 text-base sm:text-lg font-medium">Manage your tickets, profile, and support.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 flex flex-col xl:flex-row gap-4 xl:gap-8" style={{ minHeight: 0 }}>
        {/* Sidebar for desktop and overlay for mobile */}
        <div>
          {/* Overlay for mobile sidebar */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black bg-opacity-30 z-40 xl:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}
          <aside
            className={`fixed xl:static top-0 left-0 z-50 xl:z-auto h-full xl:h-auto w-64 xl:w-full transition-transform duration-300 bg-white shadow-lg xl:shadow-xl rounded-none xl:rounded-2xl xl:rounded-3xl p-2 xl:p-4 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0`}
            style={{ maxWidth: '100vw' }}
          >
            {/* Logo at the top of sidebar on mobile */}
            {showSidebar && (
              <div className="flex items-center justify-between py-4 xl:hidden">
                <img src={logo} alt="Logo" className="h-12 drop-shadow-xl" />
                <button
                  className="p-2 rounded hover:bg-gray-200 focus:outline-none ml-2"
                  onClick={() => setShowSidebar(false)}
                  aria-label="Close sidebar"
                >
                  <XMarkIcon className="h-7 w-7 text-gray-700" />
                </button>
              </div>
            )}
            <nav className="flex flex-col w-full relative z-10 bg-transparent rounded-2xl xl:rounded-3xl shadow-none border-none xl:border border-gray-200">
              <div className="flex flex-col w-full space-y-2">
                {menuItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'home' && item.action) {
                        item.action();
                      } else {
                        setActiveTab(item.id); 
                        setShowSidebar(false);
                        setShowNewTicketForm(false);
                      }
                    }}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border font-semibold text-base transition-all duration-200 shadow w-full
                      ${typeof activeTab === 'string' && activeTab === item.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-black/10 hover:bg-black hover:text-white'}
                    `}
                  >
                    <item.icon className="h-6 w-6" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 xl:mt-6">
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full flex items-center justify-center xl:justify-start gap-2 xl:gap-3 text-red-500 hover:text-white border border-red-500 hover:bg-red-500/80 hover:scale-105 transition-all duration-200 px-2 xl:px-6 py-2 xl:py-3 rounded-xl font-semibold text-base xl:text-lg shadow relative z-10 bg-white"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 xl:h-6 xl:w-6" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>
        </div>

        {/* Content Area with widgets and accent headers */}
        <section className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <div className="w-full rounded-2xl xl:rounded-3xl bg-white/70 backdrop-blur-md shadow-2xl p-4 sm:p-6 xl:p-8 min-h-[400px] xl:min-h-[500px] border border-gray-200">
            {renderContent()}
          </div>
        </section>
      </main>

      {/* Notification Drawer */}
      {showNotificationsPanel && (
        <>
          {/* Overlay */}
          <div
            className="fixed left-0 right-0 z-50 bg-black/30"
            style={{ top: '90px', bottom: 0 }}
            onClick={() => setShowNotificationsPanel(false)}
          />
          {/* Drawer */}
          <div
            className="fixed z-50 right-0 bg-white shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right"
            style={{
              top: '90px',
              height: 'calc(100vh - 64px)',
              width: '100%',
              maxWidth: '28rem', // max-w-md
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
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-500">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">No notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* function validateProfile(form) {
  const errs = {};
  if (!form.username) {
    errs.username = 'Username is required';
  } else if (form.username.length < 3) {
    errs.username = 'Username must be at least 3 characters';
  }

  if (!form.gender) errs.gender = 'Gender is required';

  if (!form.phone) {
    errs.phone = 'Phone is required';
  } else if (!/^\d{8,15}$/.test(form.phone)) {
    errs.phone = 'Phone must be 8-15 digits';
  }

  if (!form.address) {
    errs.address = 'Address is required';
  } else if (form.address.length < 5) {
    errs.address = 'Address must be at least 5 characters';
  }

  return errs;
} */
