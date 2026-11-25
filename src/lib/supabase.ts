import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Children sign in with a username; the server maps it to this hidden email.
export const CHILD_EMAIL_DOMAIN = 'kids.kidstagram.invalid';
export const childEmail = (username: string) => `${username.trim().toLowerCase()}@${CHILD_EMAIL_DOMAIN}`;

/** A throwaway client used only to create a child's login, so the parent stays signed in. */
export function signupClient() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'kidstagram-child-signup' } });
}

export const POLICY_VERSION = '2026-11-draft';
