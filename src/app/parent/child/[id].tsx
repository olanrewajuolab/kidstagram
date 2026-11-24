import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Text } from 'react-native';

import { Body, Button, Card, ErrorText, Heading, Screen, Title } from '@/components/kit';
import { colors } from '@/components/theme';
import { deleteChild, deleteProject, getProfile, listProjects, myFriendships, removeFriend, setChildPaused } from '@/lib/api';
import { ageBand, bandRules } from '@/lib/age';
import { avatars } from '@/lib/presets';
import type { Friendship, Profile, Project } from '@/lib/types';

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Are you sure?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function ChildDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [child, setChild] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChild(await getProfile(id));
      setProjects(await listProjects(id));
      setFriends((await myFriendships(id)).filter((f) => f.status === 'accepted'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!child) return <Screen><ErrorText message={error} /></Screen>;
  const band = ageBand(child.birth_month!);

  return (
    <Screen>
      <Stack.Screen options={{ title: child.nickname }} />
      <Title>{avatars[child.avatar]} {child.nickname}</Title>
      <Body muted>{bandRules[band].label}{child.status === 'paused' ? ' · Paused' : ''}</Body>
      <Card>
        <Body>Friend code: <Text style={{ fontWeight: '800', letterSpacing: 2 }}>{child.friend_code}</Text></Body>
        <Body muted>Share this with parents of children your child knows in real life.</Body>
      </Card>
      <ErrorText message={error} />

      <Heading>Projects ({projects.length})</Heading>
      {projects.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{p.kind === 'game' ? '🎮' : '🎬'} {p.title}</Text>
          <Body muted>{p.visibility === 'friends' ? 'Shared with friends' : 'Private'}{p.moderation === 'flagged' ? ' · Reported, under review' : ''}</Body>
          <Button label="Delete project" variant="danger" onPress={async () => {
            if (await confirm(`Delete "${p.title}"?`)) { await deleteProject(p.id); await load(); }
          }} />
        </Card>
      ))}

      <Heading>Friends ({friends.length})</Heading>
      {friends.map((f) => {
        const other = f.requester_id === id ? f.addressee : f.requester;
        return (
          <Card key={f.id}>
            <Body>{avatars[other?.avatar ?? 'star']} {other?.nickname}</Body>
            <Button label="Remove friend" variant="danger" onPress={async () => {
              if (await confirm(`Remove ${other?.nickname} as a friend?`)) { await removeFriend(f.id); await load(); }
            }} />
          </Card>
        );
      })}

      <Heading>Account</Heading>
      <Button
        label={child.status === 'paused' ? 'Unpause account' : 'Pause account'}
        variant="secondary"
        onPress={async () => { await setChildPaused(child.id, child.status !== 'paused'); await load(); }}
      />
      <Button label="Delete account and all data" variant="danger" onPress={async () => {
        if (await confirm(`This permanently deletes ${child.nickname}'s account, projects and comments.`)) {
          try { await deleteChild(child.id); router.back(); } catch (e) { setError((e as Error).message); }
        }
      }} />
    </Screen>
  );
}
