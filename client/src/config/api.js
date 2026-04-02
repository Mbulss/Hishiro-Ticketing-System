// API configuration for different environments
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    // Dynamically point to the same server it is hosted on
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export const API_URL = getApiUrl();

// For socket.io connections
export const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export default {
  API_URL,
  getSocketUrl
}; 