import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css"; // Updated CSS import path

import App from "./App";

// Global error handler for 404 and other network errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('404')) {
    console.warn('404 error caught:', event.message);
    // Don't show error to user for 404s on non-critical resources
    event.preventDefault();
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior
  event.preventDefault();
});

// Global error boundary for initialization errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('Cannot access')) {
    console.error('Initialization error detected:', event.error);
    // Try to reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
