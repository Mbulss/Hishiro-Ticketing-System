// API configuration for different environments
const getApiUrl = () => {
  // In production (Docker), use the external backend domain
  if (import.meta.env.PROD) {
    return 'https://e2425-wads-l4ccg2-server.csbihub.id';
  }
  
  // In development, use environment variable or localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export const API_URL = getApiUrl();

// For socket.io connections
export const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://e2425-wads-l4ccg2-server.csbihub.id';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3032';
};

export default {
  API_URL,
  getSocketUrl
}; 