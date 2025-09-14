import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        // Guest mode: generate random guest user
        const guest = localStorage.getItem('guestUser');
        if (guest) {
          setUser(JSON.parse(guest));
        } else {
          const guestUser = {
            id: 'guest-' + Math.random().toString(36).substring(2, 10),
            username: 'Guest' + Math.floor(Math.random() * 10000),
            isGuest: true,
          };
          localStorage.setItem('guestUser', JSON.stringify(guestUser));
          setUser(guestUser);
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setUser(session.user);
        localStorage.removeItem('guestUser');
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      // Add basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Supabase login error:', error);
        throw new Error(error.message || 'Login failed');
      }
      
      setUser(data.user);
      localStorage.removeItem('guestUser');
      return data.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signup = async (email, password, displayName) => {
    try {
      // Add basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });
      
      if (error) {
        console.error('Supabase signup error:', error);
        throw new Error(error.message || 'Signup failed');
      }
      
      setUser(data.user);
      localStorage.removeItem('guestUser');
      return data.user;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Optionally, re-enable guest mode
    const guestUser = {
      id: 'guest-' + Math.random().toString(36).substring(2, 10),
      username: 'Guest' + Math.floor(Math.random() * 10000),
      isGuest: true,
    };
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
