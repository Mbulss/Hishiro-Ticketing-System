import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { io } from 'socket.io-client';
import { API_URL } from '../../config/api';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchTicket = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets/${id}`, {
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
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets/${id}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchMessages();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time updates with Socket.IO
  useEffect(() => {
    if (!user) return;
    const sock = io(API_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    socketRef.current = sock;
    
    sock.on('connect', () => {
      console.log('Admin socket connected successfully');
      sock.emit('joinTicketRoom', id);
    });

    sock.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
    });

    sock.on('disconnect', (reason) => {
      console.log('Admin socket disconnected:', reason);
    });

    sock.on('ticketMessage', (data) => {
      if (data.ticketId === id) {
        setMessages(prev => {
          // Fix deduplication: always check for tempId if present
          const exists = prev.some(m => 
            (m.tempId && data.tempId && m.tempId === data.tempId) || 
            (!data.tempId && m.text === data.message && m.sender === data.sender && 
             Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 1000)
          );
          if (exists) return prev;
          return [...prev, {
            text: data.message,
            sender: data.sender,
            time: data.time,
            tempId: data.tempId
          }];
        });
      }
    });

    // Handle status updates
    sock.on('ticketStatusUpdated', (data) => {
      if (data.ticketId === id) {
        setTicket(prev => ({ ...prev, status: data.status }));
        setStatus(data.status);
        
        // Add system message only if not already present
        setMessages(prev => {
          const recentSystemMsg = prev.slice(-3).find(m => 
            m.sender === 'system' && 
            m.text && m.text.includes('status updated to') &&
            Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 5000
          );
          
          if (recentSystemMsg) return prev; // Don't add duplicate
          
          return [...prev, {
            text: `Ticket status updated to: ${data.status}`,
            sender: 'system',
            time: data.time
          }];
        });
      }
    });

    // Handle priority updates
    sock.on('ticketPriorityUpdated', (data) => {
      if (data.ticketId === id) {
        setTicket(prev => ({ ...prev, priority: data.priority }));
        
        // Add system message only if not already present
        setMessages(prev => {
          const recentSystemMsg = prev.slice(-3).find(m => 
            m.sender === 'system' && 
            m.text && m.text.includes('priority updated to') &&
            Math.abs(new Date(m.time).getTime() - new Date(data.time).getTime()) < 5000
          );
          
          if (recentSystemMsg) return prev; // Don't add duplicate
          
          return [...prev, {
            text: `Ticket priority updated to: ${data.priority}`,
            sender: 'system',
            time: data.time
          }];
        });
      }
    });

    return () => {
      sock.disconnect();
    };
  }, [id, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: reply, 
          status,
          priority: ticket.priority || 'medium'
        })
      });
      if (res.ok) {
        setReply('');
        // Refresh messages and ticket status
        const data = await res.json();
        setMessages(data.messages || []);
        setTicket(data.ticket || ticket);
      }
    } catch (err) {
      // Optionally handle error
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <main className="flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <main className="flex-1">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg">Error: {error}</div>
        </main>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <main className="flex-1">
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">Ticket not found</div>
        </main>
      </AdminLayout>
    );
  }

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'resolved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <AdminLayout>
      <main className="flex-1 max-w-3xl mx-auto py-8 px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-2 text-xs text-gray-400">Ticket #{ticket._id.substring(0, 8)}</div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject || 'Untitled Ticket'}</h1>
              <div className="text-sm text-gray-500 mb-2">From: {ticket.userEmail || ticket.userId}</div>
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
                  : ticket.status === "closed"
                  ? "border-zinc-400 text-zinc-700 bg-white"
                  : "border-blue-500 text-blue-700 bg-white" // default for 'open'
              }`}>
                {ticket.status === "resolved" ? "Resolved"
                  : ticket.status === "in-progress" ? "In Progress"
                  : ticket.status === "closed" ? "Closed"
                  : "Open"}
              </span>
            </div>
          </div>
          <div className="prose max-w-none mb-4">
            <p className="text-gray-600 whitespace-pre-line">{ticket.message}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
            <div>Created: {new Date(ticket.createdAt).toLocaleString()}</div>
            <div>Last updated: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          {messages.length === 0 ? (
            <div className="text-gray-500">No messages yet.</div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex ${
                  msg.sender === 'system' ? 'justify-center' : 
                  msg.sender === 'admin' ? 'justify-end' : 'justify-start'
                }`}>
                  {msg.sender === 'system' ? (
                    // System message styling - matches client-side format
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-md">
                      <div className="flex items-center text-yellow-800">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">{msg.text}</span>
                      </div>
                      <div className="text-xs text-yellow-600 mt-1 text-center">
                        {msg.time ? new Date(msg.time).toLocaleString() : ''}
                      </div>
                    </div>
                  ) : (
                    // Regular message styling
                    <div className={`rounded-lg px-4 py-2 max-w-[70%] ${msg.sender === 'admin' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'}`}>
                      <div className="text-xs mb-1 font-semibold">{msg.sender === 'admin' ? 'You' : 'User'}</div>
                      <div>{msg.text}</div>
                      <div className="text-xs opacity-60 mt-1">{msg.time ? new Date(msg.time).toLocaleString() : ''}</div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-lg font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Admin Reply Panel
            </h2>
            <p className="text-blue-100 text-sm mt-1">Respond to ticket and manage status & priority</p>
          </div>

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
                  onClick={() => setReply('')}
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
        </div>
      </main>
    </AdminLayout>
  );
} 