// API configuration for different environments
const getApiUrl = () => {
  // If we are running on a real domain (like vercel), always use the same origin
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export const API_URL = getApiUrl();

// For socket.io connections (if still needed)
export const getSocketUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export default {
  API_URL,
  getSocketUrl
}; 