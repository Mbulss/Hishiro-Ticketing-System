import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, sendPasswordReset } from "../firebase";
import bg from "../assets/background-scaled.png";
import logo from "../assets/logo.png";

export default function Reset() {
  const [email, setEmail] = useState("");
  const [user, loading] = useAuthState(auth);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate("/");
  }, [user, loading, navigate]);

  const handleReset = async (e) => {
    e.preventDefault();
    setApiError("");
    setSuccess("");
    setSending(true);
    try {
      await sendPasswordReset(email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundRepeat: "repeat",
        backgroundSize: "1000px 800px",
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
        onSubmit={handleReset}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm"
      >
        <img src={logo} alt="Hishiro" className="h-10 mx-auto mb-4" />
        <h2 className="text-center text-2xl font-semibold mb-6">
          Reset Password
        </h2>

        {apiError && (
          <div className="text-red-600 text-sm mb-2">{apiError}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm mb-2">{success}</div>
        )}

        <label className="block mb-1 text-sm font-medium">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:ring focus:outline-none"
          required
        />

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-black text-white rounded px-4 py-2 mb-4 hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send password reset email"}
        </button>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Create Account
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          Remembered your password?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}