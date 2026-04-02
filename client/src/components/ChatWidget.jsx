// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { io } from "socket.io-client";
import { useNotifications } from '../contexts/NotificationContext';
import customerSupportIcon from "../assets/customer-support.png";
import { generateBotResponse } from "../services/geminiService";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { getSocketUrl, API_URL } from '../config/api';

export default function ChatWidget({ fullPage = false, hideHeader = false, ticketId = null }) {
  const [open, setOpen] = useState(fullPage);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "support", type: "text", text: fullPage ? "Please wait until our admin joins this conversation." : "Hi there! How can we help you today?" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [socketError, setSocketError] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const [isAdminPresent, setIsAdminPresent] = useState(false);
  const { addNotification } = useNotifications();
  const [user, loading] = useAuthState(auth);

  // Socket connection
  useEffect(() => {
    // Only connect to socket if not in full page mode (where socket might be handled differently)
    // Or if in full page mode and we have a ticketId (meaning an existing chat)
    if (!fullPage || (fullPage && ticketId)) {
      const socketUrl = getSocketUrl();
      const sock = io(socketUrl, {
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      sock.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setSocketError(true);
      });

      sock.on("connect", () => {
        console.log("Socket connected successfully");
        setSocketError(false);
      });

      // Handle ticket creation confirmation from backend (if still using a backend confirmation)
      // This might be removed if ticket creation is purely via API now
      sock.on("ticketCreated", (ticket) => {
        setCurrentTicket(ticket);
        // Provide a link to communicate with admin after the ticket is created
        setMessages(prev => [...prev, {
          from: 'system',
          type: 'text',
          text: `A support ticket has been created for your issue. Please click here to continue the conversation with our support team.`,
          time: new Date().toLocaleTimeString(),
          isLink: true,
          linkUrl: `/chat/${ticket._id}`
        }]);
      });

      // Handle ticket messages
      sock.on("ticketMessage", (data) => {
        // Only add messages if we are in the full page ticket chat and the ticketId matches,
        // AND the message was not sent by the current user.
        if (fullPage && (ticketId === data.ticketId) && data.sender !== 'user') {
          setMessages(prev => [...prev, {
            from: data.sender === 'admin' ? 'support' : data.sender,
            type: 'text',
            text: data.message,
            time: data.time
          }]);

          // Add notification for admin message
          if (data.sender === 'admin') {
            addNotification({
              title: 'New Message from Admin',
              message: `Ticket #${data.ticketId.substring(0, 8)}...`,
              icon: (
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              )
            });
          }
        }
      });

      // Handle admin joining
      sock.on("adminJoined", (data) => {
        console.log("adminJoined event received in ChatWidget", data);
        setIsAdminPresent(true);
        // Only show admin joined message on the full page
        if (fullPage) {
          setMessages(prev => [...prev, {
            from: 'system',
            type: 'text',
            text: 'An admin has joined the conversation.',
            time: data.time
          }]);
        }
      });

      // Handle user leaving
      sock.on("userLeft", (data) => {
        // Only show user left message on the full page
        if (fullPage) {
          setMessages(prev => [...prev, {
            from: 'system',
            type: 'text',
            text: 'A user has left the conversation.',
            time: data.time
          }]);
        }
      });

      // Handle ticket status updates
      sock.on("ticketStatusUpdated", (data) => {
        // Only show status updates on the full page
        if (fullPage) {
          setMessages(prev => [...prev, {
            from: 'system',
            type: 'text',
            text: `Ticket status updated to: ${data.status}`,
            time: data.time
          }]);
        }
      });

      // Listen for admin left notification
      sock.on('adminLeft', (data) => {
        setIsAdminPresent(false);
        // Only show admin left message on the full page
        if (fullPage) {
          setMessages(prev => [...prev, {
            from: 'system',
            type: 'text',
            text: 'The admin has left converstation.',
            time: data.time
          }]);
        }
      });

      socketRef.current = sock;

      return () => { 
        sock.disconnect();
      };
    } else if (socketRef.current) {
       // If conditions change and socket should no longer be connected, disconnect it
       socketRef.current.disconnect();
       socketRef.current = null;
    }
  }, [fullPage, ticketId]); // Added fullPage and ticketId to dependencies

  // Join ticket room if ticket exists or if ticketId prop is provided
  useEffect(() => {
    if ((currentTicket || ticketId) && socketRef.current) {
      const ticketToJoin = ticketId || currentTicket._id;
      
      // If on the full page and have a ticketId, the user should join the room
      if (fullPage && ticketId) {
        console.log('Emitting userJoinTicketRoom for ticket:', ticketId);
        socketRef.current.emit('userJoinTicketRoom', ticketId);
      } else if (currentTicket && socketRef.current) {
           // Existing logic for admin/system joining, if applicable
          socketRef.current.emit('joinTicketRoom', ticketToJoin); // Keep existing for admin/system
      }
      
      // If we have a ticketId prop, set it as the current ticket for display purposes
      if (ticketId && !currentTicket) {
        setCurrentTicket({ _id: ticketId });
      }
    }
  }, [currentTicket, ticketId, fullPage]); // Added fullPage to dependencies

  // Auto-scroll
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  // FAQ listener (Seems like a duplicate useEffect for scrolling, might need review)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (txt) => {
    if (!txt.trim()) return;
    
    // Add user message
    setMessages((prev) => [...prev, { from: "user", type: "text", text: txt }]);
    
    // Only allow chat messages in full chat page for existing tickets
    if (fullPage && (currentTicket || ticketId)) {
      console.log('Attempting to emit ticketMessage from full page:', { ticketId: ticketId || currentTicket?._id, message: txt });
      socketRef.current.emit("ticketMessage", {
        ticketId: ticketId || currentTicket._id,
        message: txt,
        isAdmin: false,
        sender: 'user'
      });
    } else if (!fullPage) {
      // Only process with bot if not in full page mode (ticket view)
      setIsTyping(true);
      try {
        const response = await generateBotResponse([...messages, { from: "user", type: "text", text: txt }], user);
        
        // Add bot response
        setMessages((prev) => [...prev, { from: "support", type: "text", text: response.text }]);
        
        // If ticket is needed and we have a problem description
        if (response.needsTicket) {
          if (!user) {
            setMessages((prev) => [...prev, { 
              from: "system", 
              type: "text", 
              text: "Please log in to create a support ticket. You can log in using the account icon in the top right corner." 
            }]);
            setIsTyping(false);
            return;
          }

          // Get the problem description from the conversation history
          const problemDescription = messages
            .filter(msg => msg.from === "user" && msg.text.length > 50)
            .map(msg => msg.text)
            .join("\n\n");

          // Generate a proper subject from the problem description
          const generateSubject = (description) => {
            // Get the first sentence or first 100 characters
            const firstSentence = description.split(/[.!?]/)[0].trim();
            if (firstSentence.length <= 100) {
              return firstSentence;
            }
            // If first sentence is too long, take first 100 characters and add ellipsis
            return description.substring(0, 100).trim() + '...';
          };

          console.log('Attempting to create ticket via API');
          const createTicketResponse = await fetch(`${API_URL}/api/tickets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({
              message: problemDescription || txt, // Use the full problem description if available
              subject: generateSubject(problemDescription || txt), // Generate proper subject
              userId: user.uid,
              botResponse: response.text
            })
          });

          if (!createTicketResponse.ok) {
            const errorBody = await createTicketResponse.text();
            console.error('Ticket creation failed:', createTicketResponse.status, errorBody);
            setMessages((prev) => [...prev, { from: "system", type: "text", text: `Failed to create ticket. Please try again later. (${createTicketResponse.status})` }]);
            setIsTyping(false);
            if (createTicketResponse.status === 401) {
              toast.error('Please log in to create a ticket.');
            }
            return;
          }

          const newTicket = await createTicketResponse.json();
          console.log('Ticket created successfully:', newTicket);
          setCurrentTicket(newTicket);

          // Update messages to indicate ticket created and provide info with dashboard button
          setMessages(prev => [...prev, {
            from: 'system',
            type: 'dashboard-link',
            text: `A support ticket has been created for your issue.`,
            time: new Date().toLocaleTimeString(),
          }]);

          // Join the ticket room via socket after successful creation
          if (socketRef.current) {
            socketRef.current.emit('userJoinTicketRoom', newTicket._id);
            console.log('Emitting userJoinTicketRoom after creation for ticket:', newTicket._id);
          }
        }

        setIsTyping(false);
      } catch (error) {
        console.error("Error sending message or generating bot response:", error);
        setMessages((prev) => [...prev, { from: "system", type: "text", text: "Sorry, there was an error processing your request." }]);
        setIsTyping(false);
      }
    }
    
    setTextInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput);
    }
  };

  // Image upload
  const handleImage = file => {
    const reader = new FileReader();
    reader.onload = () =>
      setMessages(prev => [...prev, { from: "user", type: "image", src: reader.result }]);
    reader.readAsDataURL(file);
  };

  // Lifted panel
  const wrapperCls = fullPage
    ? "w-full flex flex-col flex-1 bg-white border border-gray-300 shadow-inner overflow-hidden"
    : "fixed bottom-4 sm:bottom-6 right-0 z-50 w-full h-1/2 sm:w-96 sm:h-[28rem] rounded-t-xl sm:rounded-xl bg-white border border-gray-300 shadow-xl flex flex-col";

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${fullPage ? "!static !bottom-auto !right-auto !z-auto w-full h-full" : ""}`}
    >
      {!fullPage && !open && (
        <button
          className="group bg-white text-black rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-black hover:text-white focus:outline-none transition-colors duration-200"
          onClick={() => setOpen(!open)}
          aria-label="Open chat widget"
        >
          <img src={customerSupportIcon} alt="Support" className="w-8 h-8 transition-all duration-200 group-hover:invert" />
        </button>
      )}

      {(open || fullPage) && (
        <div
          className={`bg-white rounded-lg shadow-lg flex flex-col ${fullPage ? "w-full h-full" : "w-80 h-96"}`}
        >
          {/* Header */}
          {!hideHeader && (
            <div
              className={`bg-black text-white p-4 rounded-t-lg flex items-center justify-between ${fullPage ? "" : "cursor-pointer"}`}
              onClick={() => !fullPage && setOpen(!open)}
            >
              <h3 className="text-lg font-semibold">Support Chat</h3>
              {!fullPage && (
                <button
                  className="text-white hover:text-gray-200 focus:outline-none"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat widget"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Error message for socket connection */}
          {socketError && (
            <div className="bg-red-100 text-red-800 text-sm p-2 text-center">
              Connection error. Some features may not be available.
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${msg.from === "user"
                    ? "bg-black text-white"
                    : msg.from === "support" ? "bg-white text-black border border-black" : "bg-gray-100 text-black border-black" // System messages
                    }`}
                >
                  {msg.type === 'dashboard-link' ? (
                    <div className="flex flex-col items-start gap-2">
                      <span>{msg.text}</span>
                      <a
                        href="/dashboard"
                        className="inline-block bg-black text-white px-3 py-1 rounded hover:bg-gray-900 transition-colors duration-150 text-sm font-medium mt-1"
                      >
                        Go to My Dashboard
                      </a>
                    </div>
                  ) : msg.isLink ? (
                    <a href={msg.linkUrl} className="text-blue-800 underline hover:no-underline">{msg.text}</a>
                  ) : (
                    msg.text
                  )}
                  {msg.time && <div className="text-xs opacity-75 mt-1">{msg.time}</div>} {/* Display timestamp */}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="p-3 rounded-lg max-w-[80%] bg-gray-200 text-gray-800">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} /> {/* Auto-scroll anchor */}
          </div>

          {/* Input area */}
          {(!fullPage || (fullPage && (currentTicket || ticketId))) && ( // Only show input if not full page or in a ticket chat
             <div className="p-4 border-t flex items-center">
              {fullPage && ( // Only show file upload in full page chat
                 <button className="mr-2 p-2 text-gray-600 hover:text-gray-800 focus:outline-none" title="Attach File">
                    <PhotoIcon className="h-6 w-6" />
                 </button>
              )}
              <input
                type="text"
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-grey-300"
                placeholder="Type your message..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping || (fullPage && !isAdminPresent && !ticketId)} // Disable input if typing or admin not present in full page chat without ticketId
              />
              <button
                className="ml-2 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-black hover:border hover:border-black transition-all duration-200 disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
                onClick={() => sendMessage(textInput)}
                disabled={isTyping || !textInput.trim() || (fullPage && !isAdminPresent && !ticketId)}
              >
                Send
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
