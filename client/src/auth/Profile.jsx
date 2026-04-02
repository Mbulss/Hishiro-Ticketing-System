import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { auth, logout } from "../firebase";
import logo from "../assets/logo.png";
import bg from "../assets/background-scaled.png";

export default function Profile() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundRepeat: "repeat",
        backgroundSize: "1000px 800px",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium shadow"
        style={{ zIndex: 10 }}
      >
        ← 
      </button>
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <img src={logo} alt="Hishiro" className="h-10 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Profile</h2>
        <img
          src={user.photoURL || "https://ui-avatars.com/api/?name=" + user.email}
          alt="avatar"
          className="w-20 h-20 rounded-full mx-auto mb-4"
        />
        <div className="mb-2 font-medium">{user.displayName || "No Name"}</div>
        <div className="mb-4 text-gray-600 text-sm">{user.email}</div>
        {/* Sign out button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full bg-black text-white rounded px-4 py-2 hover:opacity-90"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}