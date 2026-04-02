import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import bg from '../assets/background-scaled.png';
import logo from '../assets/logo.png';
import { useAuthState } from "react-firebase-hooks/auth";
import { API_URL } from '../config/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, userLoading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const token = await user.getIdToken();
        const url = `${API_URL}/api/admin/check`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    };
    checkAdmin();
  }, [user]);

  if (user && !userLoading && isAdmin === true) {
    return <Navigate to="/admin" replace />;
  }
  if (user && !userLoading && isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get the token
      const token = await user.getIdToken();
      const url = `${API_URL}/api/admin/check`;

      // Check admin status through API
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.isAdmin) {
        toast.success('Welcome back, Admin!');
        // Redirect to the originally attempted URL or admin dashboard
        const from = location.state?.from || '/admin';
        navigate(from);
      } else {
        // If not admin, sign them out and show error
        await auth.signOut();
        toast.error('Access denied. Admin privileges required.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '1000px 800px',
      }}
    >
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium shadow"
        style={{ zIndex: 10 }}
      >
        ←
      </button>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm"
      >
        <img src={logo} alt="Hishiro" className="h-10 mx-auto mb-4" />
        <h2 className="text-center text-2xl font-semibold mb-6">
          Admin Login
        </h2>

        <label className="block mb-1 text-sm font-medium">Email address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:ring focus:outline-none"
          required
        />

        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Password</label>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:ring focus:outline-none"
          required
        />

        <button
          type="submit"
          className="w-full bg-black text-white rounded px-4 py-2 mb-2 hover:opacity-90"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
} 
