import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Heading, Screen } from '@/components/kit';
import { space } from '@/components/theme';
import { giveConsent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { POLICY_VERSION } from '@/lib/supabase';

// NOTE: Typed-name attestation is a placeholder. Before launch, replace it with a
// COPPA-approved verifiable parental consent method (card check, ID check, etc.)
// and have a lawyer review this notice and the privacy policy.
export default function Consent() {
  const { profile, refresh } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!agreed || signedName.trim().length < 3) return setError('Please tick the box and type your full name.');
    try {
      await giveConsent(profile!.id, signedName.trim(), POLICY_VERSION);
      await refresh();
      router.replace('/parent');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      <Body>Before your child can use Kidstagram, please read what we collect and how we keep them safe.</Body>
      <Card>
        <Heading>What we collect about your child</Heading>
        <Body>• A nickname and a cartoon avatar. No real names, photos of faces, emails or phone numbers.</Body>
        <Body>• Their birth month and year, only to choose age-appropriate settings.</Body>
        <Body>• The projects, steps and comments they make.</Body>
        <Heading>How we keep them safe</Heading>
        <Body>• Everything is private by default. There are no direct messages and no public search.</Body>
        <Body>• Friends connect with a friend code you share in person. Under-13s need your approval for every friend.</Body>
        <Body>• Children aged 5 to 8 can only send ready-made comments. Everything else is filtered for personal info and unkind words.</Body>
        <Body>• Anyone can report anything. You can pause or delete your child's account at any time, and that deletes their data.</Body>
        <Body>• We never show ads or sell data.</Body>
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Switch value={agreed} onValueChange={setAgreed} accessibilityLabel="I agree" />
        <Body style={{ flex: 1 }}>I am the parent or legal guardian and I consent to Kidstagram collecting the information above for my child.</Body>
      </View>
      <Field label="Type your full name to sign" value={signedName} onChangeText={setSignedName} autoComplete="name" />
      <ErrorText message={error} />
      <Button label="Give consent" onPress={submit} />
    </Screen>
  );
}
