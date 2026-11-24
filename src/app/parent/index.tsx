import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Heading, Row, Screen, Title } from '@/components/kit';
import { colors } from '@/components/theme';
import { myChildren, parentDecide, pendingApprovals } from '@/lib/api';
import { ageBand, bandRules } from '@/lib/age';
import { useAuth } from '@/lib/auth';
import { avatars } from '@/lib/presets';
import type { Friendship, Profile } from '@/lib/types';

export default function ParentHome() {
  const { profile, signOut } = useAuth();
  const [kids, setKids] = useState<Profile[]>([]);
  const [approvals, setApprovals] = useState<Friendship[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const children = await myChildren(profile!.id);
      setKids(children);
      setApprovals(await pendingApprovals(children.map((c) => c.id)));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const kidIds = kids.map((k) => k.id);
  const decide = async (f: Friendship, approve: boolean) => {
    await parentDecide(f, kidIds, approve);
    await load();
  };

  return (
    <Screen>
      <Title>Hi {profile?.nickname} 👋</Title>
      <ErrorText message={error} />

      {approvals.length > 0 && (
        <>
          <Heading>Friend requests to approve</Heading>
          {approvals.map((f) => {
            const mine = kidIds.includes(f.requester_id) ? f.requester : f.addressee;
            const other = kidIds.includes(f.requester_id) ? f.addressee : f.requester;
            return (
              <Card key={f.id}>
                <Body>
                  {avatars[mine?.avatar ?? 'star']} <Text style={{ fontWeight: '700' }}>{mine?.nickname}</Text> and{' '}
                  {avatars[other?.avatar ?? 'star']} <Text style={{ fontWeight: '700' }}>{other?.nickname}</Text> want to be friends.
                </Body>
                <Body muted>Only approve if you know who this child is in real life.</Body>
                <Row>
                  <Button label="Approve" onPress={() => decide(f, true)} />
                  <Button label="Decline" variant="danger" onPress={() => decide(f, false)} />
                </Row>
              </Card>
            );
          })}
        </>
      )}

      <Heading>Your children</Heading>
      {kids.length === 0 && <Body muted>Add your first child to get them started.</Body>}
      {kids.map((k) => (
        <Card key={k.id} onPress={() => router.push(`/parent/child/${k.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 40 }}>{avatars[k.avatar] ?? '⭐'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{k.nickname}</Text>
              <Body muted>
                {bandRules[ageBand(k.birth_month!)].label}
                {k.status === 'paused' ? ' · Paused' : ''}
              </Body>
            </View>
          </View>
        </Card>
      ))}
      <Button label="Add a child" onPress={() => router.push('/parent/add-child')} />
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
