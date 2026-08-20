import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, profileApi } from '../../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    try {
      const p = await profileApi.getProfile(userId);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    auth.getSession().then((s) => {
      if (!mounted) return;
      setSession(s || null);
      if (s?.user) loadProfile(s.user.id);
    });
    const unsubscribe = auth.onAuthStateChange((s) => {
      setSession(s || null);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => { mounted = false; unsubscribe?.(); };
  }, [loadProfile]);

  const value = {
    session,
    user: session?.user || null,
    profile,
    isLoading: session === undefined,
    isAuthenticated: Boolean(session?.user),
    refreshProfile: () => loadProfile(session?.user?.id),
    signUp: auth.signUp,
    signIn: auth.signIn,
    signOut: auth.signOut,
    resetPasswordForEmail: auth.resetPasswordForEmail,
    updatePassword: auth.updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
