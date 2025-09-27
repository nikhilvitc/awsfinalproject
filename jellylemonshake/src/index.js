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
  if (event.reason && event.reason.message && event.reason.message.includes('404')) {
    console.warn('404 promise rejection caught:', event.reason.message);
    event.preventDefault();
  }
});

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
