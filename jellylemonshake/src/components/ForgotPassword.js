import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/components/ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(
      "If this email is registered, you will receive a password reset link."
    );
    // Simulate API call for password reset
    setTimeout(() => {
      console.log(`Password reset link sent to: ${email}`);
    }, 1000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="auth-subtitle">Enter your email to reset your password</p>
        {message && <p className="auth-message">{message}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <button type="submit" className="auth-button">
            Send Reset Link
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
  /*sohamghosh-jellylemonshake-23bps1146 */
};

export default ForgotPassword;
