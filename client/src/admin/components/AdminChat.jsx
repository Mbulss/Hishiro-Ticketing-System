import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';

export default function AdminChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeTickets, setActiveTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const messagesEndRef = useRef(null);
  const { addNotification } = useNotifications();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Listen for new tickets
    newSocket.on('newTicket', (ticket) => {
      setActiveTickets(prev => {
        if (!prev.find(t => t._id === ticket._id)) {
          // Add notification for new ticket
          addNotification({
            title: 'New Ticket Created',
            message: `Ticket #${ticket._id.substring(0, 8)}...`,
            icon: (
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            )
          });
          return [...prev, ticket];
        }
        return prev;
      });
    });

    // Listen for ticket messages
    newSocket.on('ticketMessage', (data) => {
      console.log('Admin received ticket message:', data);
      if (selectedTicket && data.ticketId === selectedTicket._id && data.sender !== 'admin') {
        setMessages(prev => [...prev, {
          _id: Math.random().toString(),
          from: data.sender,
          text: data.message,
          time: data.time
        }]);
        
        // Add notification for new message
        addNotification({
          title: 'New Message',
          message: `From user in Ticket #${data.ticketId.substring(0, 8)}...`,
          icon: (
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )
        });
      }
    });

    // Listen for status updates
    newSocket.on('ticketStatusUpdated', (data) => {
      if (selectedTicket && data.ticketId === selectedTicket._id) {
        setSelectedTicket(prev => ({ ...prev, status: data.status }));
        setMessages(prev => [...prev, {
          _id: Math.random().toString(),
          from: 'system',
          text: `Ticket status updated to: ${data.status}`,
          time: data.time
        }]);
      }
      // Update status in active tickets list
      setActiveTickets(prev => prev.map(ticket => 
        ticket._id === data.ticketId 
          ? { ...ticket, status: data.status }
          : ticket
      ));
    });

    // Listen for admin joined notification
    newSocket.on('adminJoined', (data) => {
      if (selectedTicket && data.ticketId === selectedTicket._id) {
        setMessages(prev => [...prev, {
          _id: Math.random().toString(),
          from: 'system',
          text: 'You joined the conversation',
          time: data.time
        }]);
      }
    });

    // Listen for user left notification
    newSocket.on('userLeft', (data) => {
      if (selectedTicket && data.ticketId === selectedTicket._id) {
        setMessages(prev => [...prev, {
          _id: Math.random().toString(),
          from: 'system',
          text: 'User left the conversation',
          time: data.time
        }]);
      }
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [selectedTicket, addNotification]);

  // Join ticket room when selected
  useEffect(() => {
    if (selectedTicket && socket) {
      console.log('Admin joining room', selectedTicket._id);
      socket.emit('joinTicketRoom', selectedTicket._id);
      setMessages([]); // Clear messages when switching tickets
    }
  }, [selectedTicket, socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && socket && selectedTicket) {
      // Check if ticket is resolved
      if (selectedTicket.status === 'resolved') {
        addNotification({
          title: 'Chat Closed',
          message: 'This ticket has been resolved. No further communication is allowed.',
          icon: (
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        });
        return;
      }

      // Send message to ticket room
      socket.emit('ticketMessage', {
        ticketId: selectedTicket._id,
        message: message,
        isAdmin: true,
        sender: 'admin'
      });
      
      // Add message to local state immediately
      setMessages(prev => [...prev, {
        _id: Math.random().toString(),
        from: 'admin',
        text: message,
        time: new Date().toLocaleTimeString()
      }]);
      
      setMessage('');
    }
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleStatusUpdate = async (status) => {
    if (socket && selectedTicket) {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets/${selectedTicket._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });

        if (res.ok) {
          // Emit socket event for real-time update
          socket.emit('updateTicketStatus', {
            ticketId: selectedTicket._id,
            status
          });
          
          // Update local state
          setSelectedTicket(prev => ({ ...prev, status }));
        } else {
          console.error('Failed to update ticket status');
        }
      } catch (err) {
        console.error('Error updating ticket status:', err);
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Support Tickets</h2>
      
      <div className="flex h-[600px]">
        {/* Active Tickets Sidebar */}
        <div className="w-1/4 border-r pr-4">
          <h3 className="font-medium mb-2">Active Tickets</h3>
          <div className="overflow-y-auto max-h-[550px]">
            {activeTickets.length > 0 ? (
              <ul>
                {activeTickets.map((ticket) => (
                  <li 
                    key={ticket._id} 
                    className={`p-2 hover:bg-gray-100 rounded cursor-pointer ${
                      selectedTicket?._id === ticket._id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleTicketSelect(ticket)}
                  >
                    <div className="text-sm font-medium">
                      Ticket #{ticket._id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      Status: {ticket.status}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No active tickets</p>
            )}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="w-3/4 pl-4 flex flex-col">
          {selectedTicket ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">
                  Ticket #{selectedTicket._id.substring(0, 8)}...
                </h3>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div className="flex-grow overflow-y-auto mb-4 border rounded p-3">
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg) => (
                      <div key={msg._id} className="mb-3">
                        <div className={`flex items-start ${
                          msg.from === 'system' ? 'justify-center' : 
                          msg.from === 'admin' ? 'justify-end' : 'justify-start'
                        }`}>
                          {msg.from === 'system' ? (
                            // System message styling - matches client-side format
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-md">
                              <div className="flex items-center text-yellow-800">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">{msg.text}</span>
                              </div>
                              <div className="text-xs text-yellow-600 mt-1 text-center">
                                {msg.time}
                              </div>
                            </div>
                          ) : (
                            // Regular message styling
                            <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              msg.from === 'admin' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200'
                            }`}>
                              <p className="text-sm font-medium mb-1">
                                {msg.from === 'admin' ? 'You' : 
                                 `User: ${msg.from.substring(0, 8)}...`}
                              </p>
                              <p>{msg.text}</p>
                              <p className="text-xs opacity-75 mt-1">{msg.time}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <p className="text-gray-500 text-center mt-4">No messages yet</p>
                )}
              </div>
              
              {selectedTicket.status === 'resolved' ? (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-center text-red-600">
                  This ticket has been resolved. No further communication is allowed.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-grow border rounded-l px-3 py-2"
                  />
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-r"
                  >
                    Send
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a ticket to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
