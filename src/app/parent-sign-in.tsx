import { router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorText, Field, Screen } from '@/components/kit';
import { friendlyError } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';

export default function ParentSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) return setError(friendlyError(err.message));
    router.replace('/');
  };

  return (
    <Screen>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      <ErrorText message={error} />
      <Button label="Sign in" onPress={submit} />
    </Screen>
  );
}
