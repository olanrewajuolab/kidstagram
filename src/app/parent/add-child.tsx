import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Chip, ErrorText, Field, Heading, Row, Screen } from '@/components/kit';
import { ageYears } from '@/lib/age';
import { createChild } from '@/lib/api';
import { findTextProblem, friendlyError, problemMessages } from '@/lib/moderation';
import { avatars } from '@/lib/presets';

export default function AddChild() {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('star');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const m = Number(month);
    const y = Number(year);
    if (!(m >= 1 && m <= 12) || !(y > 2000)) return setError('Please enter the birth month (1 to 12) and year.');
    const age = ageYears(new Date(Date.UTC(y, m - 1, 1)));
    if (age < 5 || age > 16) return setError('Kidstagram is for ages 5 to 16.');
    const problem = findTextProblem(nickname);
    if (problem) return setError(problemMessages[problem]);
    try {
      await createChild({ nickname: nickname.trim(), avatar, username, password, birthYear: y, birthMonth: m });
      router.back();
    } catch (e) {
      setError(friendlyError((e as Error).message));
    }
  };

  return (
    <Screen>
      <Field label="Nickname" value={nickname} onChangeText={setNickname} hint="Not their real name. This is what friends see." maxLength={24} />
      <Heading>Avatar</Heading>
      <Row>
        {Object.entries(avatars).map(([key, emoji]) => (
          <Chip key={key} label={emoji} selected={avatar === key} onPress={() => setAvatar(key)} />
        ))}
      </Row>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Field label="Birth month" value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder="MM" maxLength={2} containerStyle={{ flex: 1 }} />
        <Field label="Birth year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="YYYY" maxLength={4} containerStyle={{ flex: 1 }} />
      </Row>
      <Body muted>We only keep the month and year, to pick safe settings for their age.</Body>
      <Field label="Username for signing in" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} hint="3 to 20 letters, numbers or _. Friends never see this." />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry hint="At least 8 characters. Keep a note of it for them." />
      <ErrorText message={error} />
      <Button label="Create account" onPress={submit} />
    </Screen>
  );
}
