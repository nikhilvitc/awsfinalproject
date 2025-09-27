import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../styles/components/Navbar.css";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setUserMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getUserInitials = () => {
    const name = user?.name || user?.user_metadata?.display_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getUserDisplayName = () => {
    return user?.name || user?.user_metadata?.display_name || user?.email || 'User';
  };

  return (
    <div className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-container">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="logo-icon"
            >
              {/* Circular background with gradient */}
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              
              {/* Circular background */}
              <circle cx="16" cy="16" r="15" fill="url(#logoGradient)" />
              
              {/* Curved arrows forming a loop */}
              <path 
                d="M8 12 Q16 6 24 12" 
                stroke="white" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
              />
              <path 
                d="M24 20 Q16 26 8 20" 
                stroke="white" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
              />
              
              {/* Code icon (</>) */}
              <g transform="translate(10, 14)">
                <path d="M2 4 L6 4 L4 6 L6 8 L2 8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              
              {/* Video camera icon */}
              <g transform="translate(18, 14)">
                <rect x="0" y="2" width="6" height="4" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="3" cy="4" r="0.8" fill="white"/>
                <path d="M0 2 L2 0 L4 0 L6 2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </g>
            </svg>
          </div>
          <span className="logo-text">ChatApp</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar-nav">
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            Home
          </Link>
          {isAuthenticated && (
            <Link 
              to="/join" 
              className={isActive('/join') ? 'active' : ''}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              Join Room
            </Link>
          )}
        </nav>

        {/* User Menu / Auth Buttons */}
        <div className="navbar-user">
          {isAuthenticated ? (
            <div className="user-menu-container" ref={menuRef}>
              <div 
                className="user-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  getUserInitials()
                )}
              </div>
              
              <div className={`user-menu ${userMenuOpen ? 'open' : ''}`}>
                <Link
                  to="/profile"
                  className="user-menu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile
                </Link>
                <button
                  className="user-menu-item danger"
                  onClick={handleLogout}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-button secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10,17 15,12 10,7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Login
              </Link>
              <Link to="/register" className="auth-button primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          <li>
            <Link 
              to="/" 
              className={isActive('/') ? 'active' : ''}
              onClick={closeMobileMenu}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9,22 9,12 15,12 15,22"></polyline>
              </svg>
              Home
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link 
                to="/join" 
                className={isActive('/join') ? 'active' : ''}
                onClick={closeMobileMenu}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Join Room
              </Link>
            </li>
          )}
          {isAuthenticated && (
            <li>
              <Link 
                to="/profile" 
                className={isActive('/profile') ? 'active' : ''}
                onClick={closeMobileMenu}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Profile
              </Link>
            </li>
          )}
          {!isAuthenticated && (
            <>
              <li>
                <Link to="/login" onClick={closeMobileMenu}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10,17 15,12 10,7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" onClick={closeMobileMenu}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Sign Up
                </Link>
              </li>
            </>
          )}
          {isAuthenticated && (
            <li>
              <button 
                className="user-menu-item danger"
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16,17 21,12 16,7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Navbar;