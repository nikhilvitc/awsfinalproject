import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../styles/components/Auth.css";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    console.log('Login form values:', { email: email.trim(), password: password.trim(), emailLength: email.trim().length, passwordLength: password.trim().length });

    // Temporary: Skip validation to test
    if (email.trim().length === 0 || password.trim().length === 0) {
      setError(`Email: "${email.trim()}" (${email.trim().length}) | Password: "${password.trim()}" (${password.trim().length}) - Please fill in all fields`);
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(email, password);
      if (result) {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Log In</h2>
        <p className="auth-subtitle">
          Welcome back! Please log in to access your account.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">
            Forgot Password?
          </Link>
          <span className="auth-divider">•</span>
          <Link to="/register" className="auth-link">
            Create Account
          </Link>
        </div>

        <div className="auth-guest">
          <Link to="/" className="guest-link">
            Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
};
/*sohamghosh-jellylemonshake-23bps1146 */
export const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    console.log('Register form values:', { 
      name: name.trim(), 
      email: email.trim(), 
      password: password.trim(), 
      confirmPassword: confirmPassword.trim(),
      nameLength: name.trim().length,
      emailLength: email.trim().length,
      passwordLength: password.trim().length,
      confirmPasswordLength: confirmPassword.trim().length
    });

    // Detailed validation with specific error messages
    if (name.trim().length === 0) {
      setError("Name is required");
      setIsLoading(false);
      return;
    }
    if (email.trim().length === 0) {
      setError("Email is required");
      setIsLoading(false);
      return;
    }
    if (password.trim().length === 0) {
      setError("Password is required");
      setIsLoading(false);
      return;
    }
    if (confirmPassword.trim().length === 0) {
      setError("Please confirm your password");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signup({ name, email, password });
      console.log('Signup result:', result);
      
      if (result.needsEmailConfirmation) {
        setVerificationSent(true);
        setError("");
        console.log('Email verification sent');
      } else if (result.user) {
        console.log('User registered and logged in:', result.user);
        navigate("/");
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">
          Sign up to save your chats and access them from any device.
        </p>

        {error && <div className="auth-error">{error}</div>}
        
        {verificationSent && (
          <div className="auth-success">
            ✅ Verification email sent! Please check your inbox and click the verification link to complete your registration.
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-links">
          <span className="auth-info-text">Already have an account?</span>
          <Link to="/login" className="auth-link">
            Log In
          </Link>
        </div>

        <div className="auth-guest">
          <Link to="/" className="guest-link">
            Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
};
