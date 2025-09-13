import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = supabase.auth.getSession();
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
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setUser(session.user);
        localStorage.removeItem('guestUser');
      } else {
        setUser(null);
      }
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    localStorage.removeItem('guestUser');
    return data.user;
  };

  const signup = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });
    if (error) throw error;
    setUser(data.user);
    localStorage.removeItem('guestUser');
    return data.user;
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
