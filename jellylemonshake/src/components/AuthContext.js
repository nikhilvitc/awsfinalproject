import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

const createGuestUser = () => ({
  id: 'guest-' + Math.random().toString(36).substring(2, 10),
  name: 'Guest' + Math.floor(Math.random() * 10000),
  username: 'Guest' + Math.floor(Math.random() * 10000),
  email: '',
  avatar: null,
  isGuest: true,
});

const normalizeSupabaseUser = (supabaseUser) => {
  const metadata = supabaseUser?.user_metadata || {};
  const fallbackName = supabaseUser?.email ? supabaseUser.email.split('@')[0] : 'User';
  const name = metadata.full_name || metadata.name || metadata.username || fallbackName;

  return {
    id: supabaseUser.id,
    name,
    username: name,
    email: supabaseUser.email || '',
    avatar: metadata.avatar_url || metadata.avatar || null,
    isGuest: false,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isSupabaseConfigured || !supabase) {
        const guest = localStorage.getItem('guestUser');
        if (guest) {
          setUser(JSON.parse(guest));
        } else {
          const guestUser = createGuestUser();
          localStorage.setItem('guestUser', JSON.stringify(guestUser));
          setUser(guestUser);
        }
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session?.user) {
        setUser(normalizeSupabaseUser(session.user));
      } else {
        const guest = localStorage.getItem('guestUser');
        if (guest) {
          setUser(JSON.parse(guest));
        } else {
          const guestUser = createGuestUser();
          localStorage.setItem('guestUser', JSON.stringify(guestUser));
          setUser(guestUser);
        }
      }

      setLoading(false);
    };

    initializeAuth();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(normalizeSupabaseUser(session.user));
        localStorage.removeItem('guestUser');
      } else {
        const guestUser = createGuestUser();
        localStorage.setItem('guestUser', JSON.stringify(guestUser));
        setUser(guestUser);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Login is unavailable: Supabase is not configured.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }

    const normalizedUser = data?.user ? normalizeSupabaseUser(data.user) : null;
    if (normalizedUser) {
      setUser(normalizedUser);
      localStorage.removeItem('guestUser');
    }

    return { success: true, user: normalizedUser };
  };

  const register = async (name, email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Registration is unavailable: Supabase is not configured.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name,
          username: name,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const normalizedUser = data?.user ? normalizeSupabaseUser(data.user) : null;
    if (normalizedUser) {
      setUser(normalizedUser);
      localStorage.removeItem('guestUser');
    }

    return { success: true, user: normalizedUser };
  };

  const signup = register;

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    const guestUser = createGuestUser();
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const isAuthenticated = !!user && !user.isGuest;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, signup, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
