import React, { createContext, useState, useEffect, useContext } from "react";
import "../styles/components/AuthContext.css";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      // Simulate API call - will be replaced with real backend later
      const mockUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        name: email.split("@")[0],
        email: email,
        avatar: null,
      };

      localStorage.setItem("user", JSON.stringify(mockUser));
      setUser(mockUser);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };
  /*sohamghosh-jellylemonshake-23bps1146 */

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      // Simulate API call - will be replaced with real backend later
      const mockUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        name: name,
        email: email,
        avatar: null,
      };

      localStorage.setItem("user", JSON.stringify(mockUser));
      setUser(mockUser);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
