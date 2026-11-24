import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Body, Button, ErrorText, Field, Screen } from '@/components/kit';
import { space } from '@/components/theme';
import { friendlyError } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';

export default function ParentSignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async () => {
    setError(null);
    if (!isAdult) return setError('You must be 18 or over and the parent or legal guardian of the child.');
    if (name.trim().length < 2) return setError('Please enter your first name.');
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: 'parent', nickname: name.trim() } },
    });
    if (err) return setError(friendlyError(err.message));
    if (!data.session) return setCheckEmail(true);
    router.replace('/');
  };

  if (checkEmail) {
    return (
      <Screen>
        <Body>We sent a link to {email}. Open it to confirm your email, then sign in.</Body>
        <Button label="Go to sign in" onPress={() => router.replace('/parent-sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Body muted>Your account lets you set up and look after your children's accounts.</Body>
      <Field label="Your first name" value={name} onChangeText={setName} autoComplete="given-name" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry hint="At least 8 characters." autoComplete="new-password" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Switch value={isAdult} onValueChange={setIsAdult} accessibilityLabel="I am 18 or over and a parent or legal guardian" />
        <Body style={{ flex: 1 }}>I'm 18 or over and a parent or legal guardian.</Body>
      </View>
      <ErrorText message={error} />
      <Button label="Create account" onPress={submit} />
    </Screen>
  );
}
