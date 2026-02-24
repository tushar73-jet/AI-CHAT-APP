import React, { useState } from 'react';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3005'}/api/auth`;

const Auth = ({ onLogin }) => {
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const response = await axios.post(`${API_URL}/google`, {
        token: credential
      });

      // The backend should return the JWT app token and username
      onLogin(response.data.token, response.data.username);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
      console.error(err);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>ChatApp</h1>
        <h2>Sign In</h2>

        <div className="loading-note" style={{ marginBottom: "20px" }}>
          <span className="info-icon">ℹ️</span>
          <span>Welcome! Please sign in with Google to join the chat.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            size="large"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default Auth;