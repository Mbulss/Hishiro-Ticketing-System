import { useEffect, useRef, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { sendEmailVerification } from "firebase/auth";
import { API_URL } from '../config/api';

const VerifyEmail = () => {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const form = useRef(location.state || {});
  const postedRef = useRef(false);
  const [status, setStatus] = useState({ loading: true, error: '', success: '' });
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasResent, setHasResent] = useState(false);

  useEffect(() => {
    setEmailVerified(user?.emailVerified ?? false);
  }, [user]);

  // Polling (Automated repeated checks) for email verification
  useEffect(() => {
    let intervalId;
    const checkVerification = async () => {
      if (user && !emailVerified) {
        await user.reload();
        setEmailVerified(auth.currentUser.emailVerified);
      }
    };
    if (user && !emailVerified) {
      intervalId = setInterval(checkVerification, 3000);
    }
    return () => clearInterval(intervalId);
  }, [user, emailVerified]);

  // Save to mongoDB when verified 
  useEffect(() => {
    const saveVerifiedUser = async () => {
      if (!loading && emailVerified && !postedRef.current && form.current.username) {
        try {
          setStatus(prev => ({ ...prev, loading: true }));
          const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              username: form.current.username || user.displayName || '',
              gender: form.current.gender || '',
              phone: form.current.phone || '',
              address: form.current.address || '',
              authProvider: "local"
            })
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save user');
          }
          postedRef.current = true;
          setStatus({ loading: false, error: '', success: 'Account activated successfully!' });
          setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
          postedRef.current = false;
          setStatus({ loading: false, error: err.message, success: '' });
        }
      }
    };
    saveVerifiedUser();
  }, [emailVerified, loading, navigate]);

  // Timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const resendVerification = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`
      });
      setStatus({ loading: false, error: '', success: 'New verification email sent!' });
      setHasResent(true);
      setCooldown(60); // Start cooldown after first resend
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
      setHasResent(true);
      setCooldown(60); // Start cooldown again to prevent spam
    }
  };

  useEffect(() => {
    if (!loading && !status.success && !status.error) {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [loading]);

  if (!form.current.username) {
    useEffect(() => {
      const timer = setTimeout(() => navigate('/login'), 3000);
      return () => clearTimeout(timer);
    }, [navigate]);

    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Email Verified!</h2>
        <p>Your email has been verified. Please log in to continue.</p>
        <Link
          to="/login"
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded inline-block"
        >
          Continue to Login
        </Link>
      </div>
    );
  }

  // Normal verify email UI
  return (
    <div className="text-center p-8">
      <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
      <p>
        A verification link has been sent to <b>{user?.email}</b>.<br />
        Please check your inbox and click the link.<br />
        After verifying, this page will continue automatically.
      </p>
      {status.error && <div className="text-red-600 mt-4">{status.error}</div>}
      {status.success && <div className="text-green-600 mt-4">{status.success}</div>}
      <button 
        onClick={resendVerification}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        disabled={status.loading || (hasResent && cooldown > 0)}
      >
        {hasResent && cooldown > 0
          ? `Resend in ${cooldown}s`
          : 'Resend Verification Email'}
      </button>
    </div>
  );
};

export default VerifyEmail;
