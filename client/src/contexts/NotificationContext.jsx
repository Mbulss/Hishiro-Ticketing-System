import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

// Icon components mapping
const getNotificationIcon = (type) => {
  switch (type) {
    case 'ticket':
      return (
        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'system':
      return (
        <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'message':
      return (
        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    case 'alert':
      return (
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'status':
      return (
        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'priority':
      return (
        <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'admin':
      return (
        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        const parsedNotifications = JSON.parse(saved);
        setNotifications(parsedNotifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp),
          // Remove any serialized icon objects and let the component generate them
          icon: undefined
        })));
      } catch (error) {
        console.error('Failed to load notifications from localStorage:', error);
        generateSampleNotifications();
      }
    } else {
      // Add some sample notifications for demo
      generateSampleNotifications();
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      // Remove icons before saving to localStorage to avoid serialization issues
      const notificationsToSave = notifications.map(n => ({
        ...n,
        icon: undefined
      }));
      localStorage.setItem('notifications', JSON.stringify(notificationsToSave));
    }
  }, [notifications]);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const generateSampleNotifications = () => {
    const sampleNotifications = [
      {
        id: Date.now() + 1,
        title: 'New Ticket Created',
        message: 'Ticket #12345 has been created by user@example.com',
        type: 'ticket',
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      },
      {
        id: Date.now() + 2,
        title: 'System Update',
        message: 'The ticketing system has been updated to version 2.1.0',
        type: 'system',
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        id: Date.now() + 3,
        title: 'New Message',
        message: 'You have a new message from admin in ticket #67890',
        type: 'message',
        read: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
      {
        id: Date.now() + 4,
        title: 'High Priority Alert',
        message: 'Multiple urgent tickets require immediate attention',
        type: 'alert',
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      }
    ];
    setNotifications(sampleNotifications);
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      read: false,
      timestamp: new Date(),
      type: notification.type || 'general',
      ...notification,
      // Don't store the icon directly, let the component generate it
      icon: undefined
    };
    
    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification for immediate feedback
    const toastOptions = {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#fff',
        color: '#374151',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '12px 16px',
        fontSize: '14px',
        maxWidth: '320px',
      },
      icon: notification.type === 'message' ? '💬' : 
            notification.type === 'status' ? '📋' : 
            notification.type === 'priority' ? '⚡' : 
            notification.type === 'admin' ? '👤' : '📌',
    };

    toast(
      `${notification.title}\n${notification.message.length > 60 ? notification.message.substring(0, 60) + '...' : notification.message}`,
      toastOptions
    );
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      deleteNotification,
      generateSampleNotifications,
      getNotificationIcon
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 
