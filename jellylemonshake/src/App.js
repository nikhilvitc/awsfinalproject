import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { AuthProvider } from "./components/AuthContext";
import Home from "./components/Home";
import ChatRoom from "./components/ChatRoom";
import { Login, Register } from "./components/Auth"; // Combined auth components
import UserProfile from "./components/UserProfile";
import Navbar from "./components/Navbar";
import ForgotPassword from "./components/ForgotPassword";
import "./styles/App.css"; // Updated CSS import path

// Wrap each page with this component
const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// Room component without animation
const RoomPage = () => {
  return <ChatRoom />;
};
/*sohamghosh-jellylemonshake-23bps1146 */
// We need this to access location for AnimatePresence
function AnimatedRoutes() {
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  const [animationKey, setAnimationKey] = useState(location.pathname);

  useEffect(() => {
    // Check if both current and previous paths are room paths
    const isRoomPath = (path) => path.startsWith("/room/");
    const currentIsRoom = isRoomPath(location.pathname);
    const prevIsRoom = isRoomPath(prevPathname);

    // If we're navigating between rooms, use a fixed key to prevent animation
    // Otherwise, use the pathname as key to trigger animation
    if (currentIsRoom && prevIsRoom) {
      setAnimationKey("room-page"); // Fixed key for room changes
    } else {
      setAnimationKey(location.pathname); // Dynamic key for other page changes
    }

    setPrevPathname(location.pathname);
  }, [location.pathname, prevPathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={animationKey}>
        {/* Pages WITH Navbar */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <Home />
              </AnimatedPage>
            </>
          }
        />

        <Route
          path="/login"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <div className="content-container">
                  <Login />
                </div>
              </AnimatedPage>
            </>
          }
        />

        <Route
          path="/register"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <div className="content-container">
                  <Register />
                </div>
              </AnimatedPage>
            </>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <div className="content-container">
                  <ForgotPassword />
                </div>
              </AnimatedPage>
            </>
          }
        />

        <Route
          path="/profile"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <div className="content-container">
                  <UserProfile />
                </div>
              </AnimatedPage>
            </>
          }
        />

        {/* Room route without AnimatedPage wrapper for instant room changes */}
        <Route path="/room/:roomId" element={<RoomPage />} />

        <Route
          path="*"
          element={
            <>
              <Navbar />
              <AnimatedPage>
                <div className="content-container">
                  <div className="not-found">Page not found</div>
                </div>
              </AnimatedPage>
            </>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <AnimatedRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
