import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useNotifications } from '../contexts/NotificationContext';
import { API_URL, getSocketUrl } from '../config/api';

export default function TicketChat() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState('');
  const { addNotification } = useNotifications();
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = (title, message, type = 'message') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const icons = {
      message: '💬',
      status: '📋',
      priority: '⚡',
      admin: '👤'
    };

    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `ticket-${ticketId}-${type}`,
      renotify: true,
      requireInteraction: type === 'priority' || type === 'status'
    });

    // Auto close after 5 seconds for regular messages
    if (type === 'message') {
      setTimeout(() => notification.close(), 5000);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  // Fetch ticket details
  useEffect(() => {
    if (!user) return;
    const fetchTicket = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch ticket: ${res.status} ${res.statusText}\nResponse body: ${text}`);
        }
        const data = await res.json();
        setTicket(data);
        setStatus(data.status || 'open');
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId, user]);

  // Fetch initial messages
  const fetchMessages = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      // Optionally handle error
    }
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line
  }, [ticketId, user]);

  // Real-time updates with Socket.IO
  useEffect(() => {
    if (!user) return;
    const socketUrl = getSocketUrl();
    const sock = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    sock.on('connect', () => {
      console.log('Socket connected successfully');
      sock.emit('userJoinTicketRoom', ticketId);
    });

    sock.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    sock.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    sock.on('ticketMessage', (data) => {
      if (data.ticketId === ticketId) {
        setMessages(prev => {
          // Fix deduplication: always check for tempId if present
          const exists = prev.some(m => 
            (m.tempId && data.tempId && m.tempId === data.tempId) || 
            (!data.tempId && m.text === data.message && m.sender === data.sender && 
             Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 1000)
          );
          if (exists) return prev;
          
          // Add notification for new message if it's from admin and user is not admin
          if (data.sender === 'admin' && !isAdmin) {
            addNotification({
              title: '💬 New Reply from Support',
              message: `Admin replied to your ticket: "${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
              type: 'message',
              ticketId: ticketId,
              ticketSubject: ticket?.subject || 'Your Ticket'
            });

            // Show browser notification
            showBrowserNotification(
              '💬 New Reply from Support',
              `Admin replied to your ticket: "${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
              'message'
            );
          }
          
          return [...prev, {
            text: data.message,
            sender: data.sender,
            time: data.time,
            tempId: data.tempId
          }];
        });
      }
    });

    // Handle admin joining
    sock.on('adminJoined', (data) => {
      if (data.ticketId === ticketId) {
        setMessages(prev => [...prev, {
          text: 'An admin has joined the conversation.',
          sender: 'system',
          time: data.time
        }]);

        // Add notification for admin joining if user is not admin
        if (!isAdmin) {
          addNotification({
            title: '👤 Support Agent Joined',
            message: 'A support agent has joined your ticket conversation',
            type: 'admin',
            ticketId: ticketId,
            ticketSubject: ticket?.subject || 'Your Ticket'
          });

          showBrowserNotification(
            '👤 Support Agent Joined',
            'A support agent has joined your ticket conversation',
            'admin'
          );
        }
      }
    });

    // Handle status updates
    sock.on('ticketStatusUpdated', (data) => {
      if (data.ticketId === ticketId) {
        setTicket(prev => ({ ...prev, status: data.status }));
        setStatus(data.status);
        
        // Add system message only if not already present
        setMessages(prev => {
          const recentSystemMsg = prev.slice(-3).find(m => 
            m.sender === 'system' && 
            m.text.includes('status updated to') &&
            Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 5000
          );
          
          if (recentSystemMsg) return prev; // Don't add duplicate
          
          return [...prev, {
            text: `Ticket status updated to: ${data.status}`,
            sender: 'system',
            time: data.time
          }];
        });

        // Add notification for status change
        if (!isAdmin) {
          const statusEmojis = {
            'new': '🆕',
            'in-progress': '⏳',
            'resolved': '✅',
            'closed': '🔒'
          };

          addNotification({
            title: `${statusEmojis[data.status] || '📋'} Ticket Status Updated`,
            message: `Your ticket status has been changed to: ${data.status}`,
            type: 'status',
            ticketId: ticketId,
            ticketSubject: ticket?.subject || 'Your Ticket'
          });

          showBrowserNotification(
            `${statusEmojis[data.status] || '📋'} Ticket Status Updated`,
            `Your ticket status has been changed to: ${data.status}`,
            'status'
          );
        }
      }
    });

    // Handle priority updates
    sock.on('ticketPriorityUpdated', (data) => {
      if (data.ticketId === ticketId) {
        setTicket(prev => ({ ...prev, priority: data.priority }));
        
        // Add system message only if not already present
        setMessages(prev => {
          const recentSystemMsg = prev.slice(-3).find(m => 
            m.sender === 'system' && 
            m.text.includes('priority updated to') &&
            Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 5000
          );
          
          if (recentSystemMsg) return prev; // Don't add duplicate
          
          return [...prev, {
            text: `Ticket priority updated to: ${data.priority}`,
            sender: 'system',
            time: data.time
          }];
        });

        // Add notification for priority change
        if (!isAdmin) {
          const priorityEmojis = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🔴'
          };

          addNotification({
            title: `${priorityEmojis[data.priority] || '⚡'} Priority Updated`,
            message: `Your ticket priority has been changed to: ${data.priority}`,
            type: 'priority',
            ticketId: ticketId,
            ticketSubject: ticket?.subject || 'Your Ticket'
          });

          showBrowserNotification(
            `${priorityEmojis[data.priority] || '⚡'} Priority Updated`,
            `Your ticket priority has been changed to: ${data.priority}`,
            'priority'
          );
        }
      }
    });

    return () => {
      sock.disconnect();
    };
  }, [ticketId, user, isAdmin, addNotification, ticket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      try {
        const token = await user.getIdToken();
        const url = `${API_URL}/api/admin/check`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.status === 403) {
          setIsAdmin(false);
          return;
        }
        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (e) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSuccess('');
    if (!reply.trim()) return;

    // Check if ticket is resolved
    if (ticket.status === 'resolved') {
      setSuccess('This ticket has been resolved. No further communication is allowed.');
      return;
    }

    setSending(true);
    
    const tempId = Date.now() + '-' + Math.random();
    const replyText = reply;
    const statusValue = status;
    const priorityValue = ticket.priority || 'medium';
    setReply(''); // Clear input immediately for better UX

    try {
      const token = await user.getIdToken();
      
      // Add message to local state immediately with tempId for optimistic UI
      const optimisticMessage = {
        text: replyText,
        sender: 'admin',
        time: new Date(),
        tempId
      };
      setMessages(prev => [...prev, optimisticMessage]);

      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: replyText, 
          status: statusValue, 
          priority: priorityValue,
          tempId 
        })
      });
      
      if (res.ok) {
        // Optionally, refresh ticket data
        const data = await res.json();
        setTicket(data.ticket || ticket);
        console.log('Admin reply sent successfully via API');
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
        setReply(replyText); // Restore the reply text
        setSuccess('Failed to send reply.');
      }
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      setReply(replyText); // Restore the reply text
      setSuccess('Failed to send reply.');
      console.error('Error sending admin reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Check if ticket is resolved
    if (ticket.status === 'resolved') {
      setSuccess('This ticket has been resolved. No further communication is allowed.');
      return;
    }

    const tempId = Date.now() + '-' + Math.random();
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const token = await user.getIdToken();
      
      // Add message to local state immediately with tempId for optimistic UI
      const optimisticMessage = {
        text: messageText,
        sender: 'user',
        time: new Date(),
        tempId
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Send via API
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/user-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: messageText, tempId })
      });

      if (!res.ok) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
        throw new Error('Failed to send message');
      }

      console.log('Message sent successfully via API');
    } catch (err) {
      console.error('Error sending message:', err);
      // Show error message to user
      setMessages(prev => [...prev.filter(m => m.tempId !== tempId), {
        text: 'Failed to send message. Please try again.',
        sender: 'system',
        time: new Date()
      }]);
    }
  };

  // Add this function to check if user can send messages
  const canUserSendMessage = () => {
    if (ticket.status === 'resolved') return false;
    
    // If there are no messages yet, user can send first message
    if (messages.length === 0) return true;
    
    // Check if the last message was from admin
    const lastMessage = messages[messages.length - 1];
    return lastMessage.sender === 'admin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
          Ticket not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
      </div>

      {/* Ticket Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {ticket.subject || 'Untitled Ticket'}
              </h1>
              <div className="text-sm text-gray-500 mb-4">
                Ticket #{ticket._id.substring(0, 8)}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Priority Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                ticket.priority === "high"
                  ? "border-red-500 text-red-700 bg-red-50"
                  : ticket.priority === "low"
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-yellow-500 text-yellow-700 bg-yellow-50" // medium
              }`}>
                {ticket.priority === "high" ? "🔴 High Priority"
                  : ticket.priority === "low" ? "🟢 Low Priority"
                  : "🟡 Medium Priority"}
              </span>
              
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                ticket.status === "resolved"
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
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 whitespace-pre-line">{ticket.message}</p>
          </div>
          <div className="mt-4 text-sm text-gray-500 flex items-center justify-between">
            <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
            <span>Last updated: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleString()}</span>
          </div>
        </div>
        {/* Conversation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Conversation
          </h2>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet.</p>
              <p className="text-sm mt-1">Start the conversation by sending a message below.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex ${
                  msg.sender === 'system' ? 'justify-center' : 
                  msg.sender === 'admin' ? 'justify-end' : 'justify-start'
                }`}>
                  {msg.sender === 'system' ? (
                    // System message styling
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-md">
                      <div className="flex items-center text-yellow-800">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">{msg.text}</span>
                      </div>
                      <div className="text-xs text-yellow-600 mt-1 text-center">
                        {new Date(msg.time).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    // Regular message styling
                    <div className={`rounded-lg px-4 py-3 max-w-[70%] shadow-sm ${
                      msg.sender === 'admin' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      <div className={`text-xs mb-2 font-semibold flex items-center ${
                        msg.sender === 'admin' ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        {msg.sender === 'admin' ? (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            You
                          </>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <div className={`text-xs mt-2 ${
                        msg.sender === 'admin' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.time).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Admin-only reply form */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Admin Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-lg font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Admin Reply Panel
              </h2>
              <p className="text-blue-100 text-sm mt-1">Respond to ticket and manage status</p>
            </div>

            {ticket.status === 'resolved' ? (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600">
                  This ticket has been resolved. No further communication is allowed.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend} className="p-6">
                {/* Reply Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Response
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                    rows={4}
                    placeholder="Type your reply to the customer..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    required
                    disabled={sending}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {reply.length}/1000 characters
                  </div>
                </div>

                {/* Status and Priority Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Status Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticket Status
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      disabled={sending}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Priority Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={ticket.priority || 'medium'}
                      onChange={e => setTicket(prev => ({ ...prev, priority: e.target.value }))}
                      disabled={sending}
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Reply will be sent immediately to the customer
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReply('');
                        setSuccess('');
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      disabled={sending}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                      disabled={sending || !reply.trim()}
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Enhanced User Message Input Form */}
        {!isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* User Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-medium flex items-center">
                <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Send Message
              </h3>
              <p className="text-sm text-blue-100 mt-1">Continue the conversation with our support team</p>
            </div>

            {ticket.status === 'resolved' ? (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600">
                  This ticket has been resolved. No further communication is allowed.
                </div>
              </div>
            ) : !canUserSendMessage() ? (
              <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-600">
                  Please wait for an admin to respond before sending another message.
                </div>
              </div>
            ) : (
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                      rows={3}
                      maxLength={1000}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {newMessage.length}/1000
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Messages are sent in real-time
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setNewMessage('')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
