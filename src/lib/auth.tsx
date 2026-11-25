import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { isConfigured, supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  hasConsent: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setHasConsent(false);
      setLoading(false);
      return;
    }
    let { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    // First sign-in after a parent signs up: create their profile from sign-up details.
    if (!data && s.user.user_metadata?.role === 'parent') {
      const res = await supabase
        .from('profiles')
        .insert({ id: s.user.id, role: 'parent', nickname: s.user.user_metadata.nickname ?? 'Parent' })
        .select('*')
        .single();
      data = res.data;
    }
    // Work out consent before publishing the profile, so screens never see a parent without it.
    let consent = false;
    if (data?.role === 'parent') {
      const { count } = await supabase
        .from('parental_consents')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', s.user.id);
      consent = Boolean(count);
    }
    setHasConsent(consent);
    setProfile(data as Profile | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Defer so we don't call Supabase inside its own auth callback.
      setTimeout(() => load(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value: AuthState = {
    loading,
    session,
    profile,
    hasConsent,
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      await load(data.session);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
