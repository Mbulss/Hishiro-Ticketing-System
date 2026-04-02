import { API_URL } from '../config/api';
import { auth } from '../firebase';

// Generate bot response using backend API
export const generateBotResponse = async (messages, user = null) => {
  try {
    // Get the current user if not provided
    const currentUser = user || auth.currentUser;
    
    if (!currentUser) {
      return {
        text: "I need you to be logged in to assist you properly. Please log in and try again.",
        needsTicket: true,
        subject: "Authentication Required"
      };
    }

    // Get Firebase ID token
    const token = await currentUser.getIdToken();

    const response = await fetch(`${API_URL}/api/chat/generate-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend chat API error:', errorData);
      
      // Return the error response from backend if it contains the expected structure
      if (errorData.text && errorData.needsTicket !== undefined) {
        return errorData;
      }
      
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error("Error calling backend chat API:", error);
    
    // Fallback responses for different error types
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        text: "I'm having trouble connecting to our servers right now. Please check your internet connection or try again in a moment. If the issue persists, I can create a support ticket for you.",
        needsTicket: true,
        subject: "Connection Issue"
      };
    }
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return {
        text: "I need you to be logged in to assist you properly. Please log in and try again. If you're having trouble logging in, I can create a support ticket for technical assistance.",
        needsTicket: true,
        subject: "Authentication Issue"
      };
    }
    
    if (error.message.includes('429')) {
      return {
        text: "I'm currently experiencing high demand and need a moment to process your request. Please try again in a few minutes, or I can create a support ticket for immediate assistance.",
        needsTicket: true,
        subject: "Service Busy"
      };
    }
    
    // Generic fallback
    return {
      text: "I apologize, but I'm having technical difficulties right now. Let me create a support ticket so our team can assist you directly with your inquiry.",
      needsTicket: true,
      subject: "Technical Support Needed"
    };
  }
}; 