import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Card, Screen } from '@/components/kit';
import { colors, space } from '@/components/theme';
import { useAuth } from '@/lib/auth';

export default function Welcome() {
  // Once signed in (the account loads a moment after the password check), go to the right home screen.
  const { profile } = useAuth();
  if (profile) return <Redirect href="/" />;

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.xl }}>
        <Text style={{ fontSize: 64 }}>🎨🎮🎬</Text>
        <Text style={{ fontSize: 40, fontWeight: '900', color: colors.primary }}>Kidstagram</Text>
        <Body muted style={{ textAlign: 'center' }}>
          Make games and shows, and help your friends make theirs.
        </Body>
      </View>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>I'm a kid</Text>
        <Body muted>Sign in with the username your grown-up made for you.</Body>
        <Button label="Kid sign in" onPress={() => router.push('/kid-sign-in')} />
      </Card>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>I'm a grown-up</Text>
        <Body muted>Parents and carers set up Kidstagram for their children.</Body>
        <Button label="Create a parent account" onPress={() => router.push('/parent-sign-up')} />
        <Button label="Parent sign in" variant="secondary" onPress={() => router.push('/parent-sign-in')} />
      </Card>
      <Button label="Privacy: how we keep your information safe" variant="ghost" onPress={() => router.push('/privacy')} />
    </Screen>
  );
}
