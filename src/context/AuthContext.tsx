import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      console.log('[AuthContext] syncSession()');
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.error('[AuthContext] getSession error:', error);
      }

      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? null;

      console.log('[AuthContext] initial session:', {
        hasSession: !!nextSession,
        userId: nextUser?.id || null,
      });

      setSession(nextSession);
      setUser(nextUser);

      if (nextUser) {
        console.log('[AuthContext] fetching profile for userId:', nextUser.id);
        await fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    // Ensure we use the persisted session ASAP (before rendering protected/RLS queries)
    syncSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('[AuthContext] onAuthStateChange:', event, {
        hasSession: !!nextSession,
        userId: nextSession?.user?.id || null,
      });

      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const fetchProfile = async (userId: string) => {
    console.log('[AuthContext] fetchProfile userId:', userId);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthContext] fetchProfile error:', error);
      return;
    }

    console.log('[AuthContext] fetchProfile result:', { role: data?.role });
    setProfile(data);
  };


  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
