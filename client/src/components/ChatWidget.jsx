// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, PhotoIcon } from "@heroicons/react/24/solid";
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

  // Polling for messages instead of socket
  useEffect(() => {
    let interval;
    if (fullPage && ticketId && user) {
      const fetchMessages = async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            // Map the messages format to our frontend format
            const formattedMessages = data.map(m => ({
              from: m.sender === 'admin' ? 'support' : m.sender,
              type: 'text',
              text: m.text,
              time: new Date(m.time).toLocaleTimeString()
            }));
            
            // Set the new messages (ignoring duplicates or replacing all)
            // For simplicity, we just replace all messages after the initial greeting
            setMessages([
              { from: "support", type: "text", text: "Please wait until our admin joins this conversation." },
              ...formattedMessages
            ]);
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
        }
      };
      
      // Fetch immediately and then every 3 seconds
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fullPage, ticketId, user]); 

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
    if (fullPage && (currentTicket || ticketId) && user) {
      try {
        const token = await user.getIdToken();
        const tid = ticketId || currentTicket._id;
        await fetch(`${API_URL}/api/tickets/${tid}/user-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: txt })
        });
      } catch (error) {
        console.error("Failed to send message via API", error);
      }
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

          // Message that ticket was created
          console.log('Ticket created successfully:', newTicket._id);
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
                disabled={isTyping} // Disable input if typing
              />
              <button
                className="ml-2 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-black hover:border hover:border-black transition-all duration-200 disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
                onClick={() => sendMessage(textInput)}
                disabled={isTyping || !textInput.trim()}
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
