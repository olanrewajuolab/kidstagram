import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Heading, Row, Screen, Title } from '@/components/kit';
import { colors } from '@/components/theme';
import { listProjects } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { avatars } from '@/lib/presets';
import type { Project } from '@/lib/types';

function ProjectCard({ p, showOwner }: { p: Project; showOwner?: boolean }) {
  return (
    <Card onPress={() => router.push(`/kid/project/${p.id}`)}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>
        {p.kind === 'game' ? '🎮' : '🎬'} {p.title}
      </Text>
      {p.description ? <Body muted>{p.description.slice(0, 120)}</Body> : null}
      {showOwner && p.owner ? <Body muted>by {avatars[p.owner.avatar]} {p.owner.nickname}</Body> : null}
    </Card>
  );
}

export default function KidHome() {
  const { profile, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listProjects().then(setProjects).catch((e) => setError(e.message));
    }, []),
  );

  if (profile?.status === 'paused') {
    return (
      <Screen>
        <Title>Taking a break ⏸️</Title>
        <Body>Your grown-up has paused your account for now. Ask them when you can come back!</Body>
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </Screen>
    );
  }

  const mine = projects.filter((p) => p.owner_id === profile?.id);
  const others = projects.filter((p) => p.owner_id !== profile?.id);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change my avatar"
          onPress={() => router.push('/kid/avatar')}
          style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 44 }}>{avatars[profile?.avatar ?? 'star'] ?? '⭐'}</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>✏️ Change</Text>
        </Pressable>
        <Title>Hi {profile?.nickname}!</Title>
      </View>
      <Row>
        <Button label="✨ New project" onPress={() => router.push('/kid/new-project')} />
        <Button label="👫 Friends" variant="secondary" onPress={() => router.push('/kid/friends')} />
      </Row>
      <ErrorText message={error} />
      <Heading>My projects</Heading>
      {mine.length === 0 && <Body muted>Nothing yet. Start a game or a show!</Body>}
      {mine.map((p) => <ProjectCard key={p.id} p={p} />)}
      <Heading>Friends' projects</Heading>
      {others.length === 0 && <Body muted>When your friends share projects, they'll show up here.</Body>}
      {others.map((p) => <ProjectCard key={p.id} p={p} showOwner />)}
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
