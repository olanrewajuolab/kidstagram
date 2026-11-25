import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Heading, Row, Screen } from '@/components/kit';
import { colors } from '@/components/theme';
import { answerFriendRequest, myFriendships, requestFriend } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/moderation';
import { avatars } from '@/lib/presets';
import type { Friendship } from '@/lib/types';

export default function Friends() {
  const { profile } = useAuth();
  const me = profile!.id;
  const [rows, setRows] = useState<Friendship[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows(await myFriendships(me)); } catch (e) { setError((e as Error).message); }
  }, [me]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    setError(null);
    setNotice(null);
    try {
      await requestFriend(code);
      setCode('');
      setNotice('Request sent! A grown-up may need to say yes first.');
      await load();
    } catch (e) {
      setError(friendlyError((e as Error).message));
    }
  };

  const friends = rows.filter((f) => f.status === 'accepted');
  const incoming = rows.filter((f) => f.status === 'pending' && f.addressee_id === me && !f.addressee_accepted);
  const waiting = rows.filter((f) => f.status === 'pending' && !(f.addressee_id === me && !f.addressee_accepted));
  const other = (f: Friendship) => (f.requester_id === me ? f.addressee : f.requester);

  return (
    <Screen>
      <Card>
        <Body>Your friend code</Body>
        <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 4, color: colors.primary }}>{profile?.friend_code}</Text>
        <Body muted>Only share it with friends you know in real life.</Body>
      </Card>
      <Field label="Add a friend by their code" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} />
      <ErrorText message={error} />
      {notice ? <Body>{notice}</Body> : null}
      <Button label="Send friend request" onPress={add} disabled={code.trim().length < 6} />

      {incoming.length > 0 && <Heading>Want to be your friend</Heading>}
      {incoming.map((f) => (
        <Card key={f.id}>
          <Body>{avatars[other(f)?.avatar ?? 'star']} {other(f)?.nickname}</Body>
          <Row>
            <Button label="Yes!" onPress={async () => { await answerFriendRequest(f.id, true); await load(); }} />
            <Button label="No thanks" variant="secondary" onPress={async () => { await answerFriendRequest(f.id, false); await load(); }} />
          </Row>
        </Card>
      ))}

      {waiting.length > 0 && <Heading>Waiting for a yes</Heading>}
      {waiting.map((f) => (
        <Card key={f.id}><Body muted>{avatars[other(f)?.avatar ?? 'star']} {other(f)?.nickname} ⏳</Body></Card>
      ))}

      <Heading>My friends</Heading>
      {friends.length === 0 && <Body muted>No friends yet. Swap codes with a friend you know!</Body>}
      {friends.map((f) => (
        <Card key={f.id}><Body>{avatars[other(f)?.avatar ?? 'star']} {other(f)?.nickname}</Body></Card>
      ))}
    </Screen>
  );
}
