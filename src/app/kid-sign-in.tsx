import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Body, Button, ErrorText, Field, Screen } from '@/components/kit';
import { friendlyError } from '@/lib/moderation';
import { childEmail, supabase } from '@/lib/supabase';

export default function KidSignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: childEmail(username), password });
    if (err) return setError(friendlyError(err.message));
    router.replace('/');
  };

  return (
    <Screen>
      <Text style={{ fontSize: 56, textAlign: 'center' }}>👋</Text>
      <Body muted>Ask your grown-up if you forgot your username or password.</Body>
      <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorText message={error} />
      <Button label="Let's go!" onPress={submit} />
    </Screen>
  );
}
