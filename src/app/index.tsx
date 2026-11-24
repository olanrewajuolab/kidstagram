import { Redirect } from 'expo-router';

import { Body, Screen, Title } from '@/components/kit';
import { Loading } from '@/components/kit';
import { useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';

export default function Gate() {
  const { loading, session, profile, hasConsent } = useAuth();

  if (!isConfigured) {
    return (
      <Screen>
        <Title>Almost ready</Title>
        <Body>
          Kidstagram needs a Supabase project. Copy .env.example to .env, add your Supabase URL and anon key, then restart
          the app. The README has the full steps.
        </Body>
      </Screen>
    );
  }
  if (loading) return <Loading />;
  if (!session || !profile) return <Redirect href="/welcome" />;
  if (profile.role === 'child') return <Redirect href="/kid" />;
  if (profile.role === 'parent' && !hasConsent) return <Redirect href="/parent/consent" />;
  return <Redirect href="/parent" />;
}
