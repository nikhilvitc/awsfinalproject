import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components/NotFound.css';

function NotFound() {
  const navigate = useNavigate();

  const goHome = () => {
    navigate('/');
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-icon">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
          </svg>
        </div>
        
        <h1 className="not-found-title">404 - Page Not Found</h1>
        
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="not-found-actions">
          <button onClick={goHome} className="not-found-btn not-found-btn-primary">
            Go Home
          </button>
          <button onClick={goBack} className="not-found-btn not-found-btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
