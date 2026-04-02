// src/auth/SignUp.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaApple, FaGoogle } from 'react-icons/fa';
import { registerWithEmailAndPassword, signInWithGoogle } from '../firebase';
import { updateProfile } from "firebase/auth";
import bg   from '../assets/background-scaled.png';
import logo from '../assets/logo.png';

export default function SignUp() {
  const [form, setForm] = useState({
    email: '', username: '', gender: '', phone: '', address: '', password: '', agree: false
  });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type==='checkbox' ? checked : value }));
    setErrors(errs => ({ ...errs, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email) {
      errs.email = 'Email is required';
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,5}$/.test(form.email)) {
      errs.email = 'Invalid email format';
    }

    if (!form.username) {
      errs.username = 'Username is required';
    } else if (form.username.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    }

    if (!form.gender) errs.gender = 'Gender is required';

    if (!form.phone) {
      errs.phone = 'Phone is required';
    } else if (!/^\d{8,15}$/.test(form.phone)) {
      errs.phone = 'Phone must be 8-15 digits';
    }

    if (!form.address) {
      errs.address = 'Address is required';
    } else if (form.address.length < 5) {
      errs.address = 'Address must be at least 5 characters';
    }

    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/\d/.test(form.password)) {
      errs.password = 'Password must include at least one number';
    }

    if (!form.agree) errs.agree = 'You must accept terms';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setApiError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      // Register with Firebase Auth
      const user = await registerWithEmailAndPassword(form.email, form.password);

      await updateProfile(user, { displayName: form.username });
      navigate('/verify-email', { state: { ...form } }); // Send form data to /verify-email
  } catch (err) {
    let msg = err.message;
    if (err.code === "auth/email-already-in-use") {
      msg = "This email is already registered. Please log in or use another email.";
    } else if (err.code === "auth/invalid-email") { // delete later
      msg = "Please enter a valid email address.";
    } 
    setApiError(msg);
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
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <img src={logo} alt="Hishiro" className="h-10 mx-auto mb-2" />
        <h2 className="text-center text-2xl font-semibold mb-4">
          Create an Account
        </h2>

        {apiError && <div className="text-red-600 text-sm">{apiError}</div>}

        {/* Email */}
        <div>
          <label className="block mb-1 text-sm font-medium">Email address</label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className={`w-full border px-3 py-2 rounded focus:outline-none ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block mb-1 text-sm font-medium">Username</label>
          <input
            name="username"
            type="text"
            placeholder="Your username"
            value={form.username}
            onChange={handleChange}
            className={`w-full border px-3 py-2 rounded focus:outline-none ${
              errors.username ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
        </div>

        {/* ← Move Gender here, before Phone/Address/Password */}
        <div>
          <label className="block mb-1 text-sm font-medium">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={`w-full border px-3 py-2 rounded focus:outline-none ${
              errors.gender ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>

        {/* Phone, Address, Password */}
        {[
          { label: 'Phone',    name: 'phone',    type: 'tel',      placeholder: 'Your phone' },
          { label: 'Address',  name: 'address',  type: 'text',     placeholder: 'Your address' },
          { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
        ].map(({ label, name, type, placeholder }) => (
          <div key={name}>
            <label className="block mb-1 text-sm font-medium">{label}</label>
            <input
              name={name}
              type={type}
              placeholder={placeholder}
              value={form[name]}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded focus:outline-none ${
                errors[name] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
          </div>
        ))}

        {/* Terms checkbox */}
        <label className="flex items-center">
          <input
            type="checkbox"
            name="agree"
            checked={form.agree}
            onChange={handleChange}
            className="mr-2"
          />
          <span className={`${errors.agree ? 'text-red-500' : ''}`}>
            I accept terms and conditions
          </span>
        </label>
        {errors.agree && <p className="text-red-500 text-xs">{errors.agree}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing Up…' : 'Sign Up'}
        </button>

        {/* Social Sign-Up */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="w-full flex items-center justify-center border border-gray-300 rounded px-4 py-2 hover:bg-gray-100"
            // Apple login not implemented yet
            onClick={() => alert('Apple login not implemented yet')}
          >
            <FaApple className="mr-2" /> Sign up with Apple
          </button>
          <button
            type="button"
            className="w-full flex items-center justify-center border border-gray-300 rounded px-4 py-2 hover:bg-gray-100"
            onClick={async () => {
              try {
                await signInWithGoogle();
                navigate('/');
              } catch (err) {
                setApiError(err.message);
              }
            }}
          >
            <FaGoogle className="mr-2 text-red-500" /> Sign up with Google
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
