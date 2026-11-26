import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Chip, ErrorText, Field, Heading, Row, Screen } from '@/components/kit';
import { createProject } from '@/lib/api';
import { gameModes, type GameMode } from '@/lib/content';
import { useAuth } from '@/lib/auth';
import { findTextProblem, friendlyError, problemMessages } from '@/lib/moderation';

export default function NewProject() {
  const { profile } = useAuth();
  const [kind, setKind] = useState<'game' | 'show'>('game');
  const [mode, setMode] = useState<GameMode>('runner');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('private');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError('Give your project a name!');
    const problem = findTextProblem(`${title} ${description}`);
    if (problem) return setError(problemMessages[problem]);
    try {
      const p = await createProject({ owner_id: profile!.id, kind, title: title.trim(), description: description.trim(), visibility }, mode);
      router.replace(`/kid/project/${p.id}`);
    } catch (e) {
      setError(friendlyError((e as Error).message));
    }
  };

  return (
    <Screen>
      <Heading>What are you making?</Heading>
      <Row>
        <Chip label="🎮 A game" selected={kind === 'game'} onPress={() => setKind('game')} />
        <Chip label="🎬 A show" selected={kind === 'show'} onPress={() => setKind('show')} />
      </Row>
      {kind === 'game' && (
        <>
          <Heading>Which kind of game?</Heading>
          <Row>
            {(Object.keys(gameModes) as GameMode[]).map((m) => (
              <Chip key={m} label={gameModes[m].label} selected={mode === m} onPress={() => setMode(m)} />
            ))}
          </Row>
          <Body muted>{gameModes[mode].blurb}</Body>
        </>
      )}
      <Field label="Name" value={title} onChangeText={setTitle} maxLength={60} placeholder={kind === 'game' ? 'Space Jumper' : 'The Dragon Who Sneezed'} />
      <Field label="What's it about?" value={description} onChangeText={setDescription} multiline maxLength={1000} />
      <Heading>Who can see it?</Heading>
      <Row>
        <Chip label="🔒 Just me" selected={visibility === 'private'} onPress={() => setVisibility('private')} />
        <Chip label="👫 My friends" selected={visibility === 'friends'} onPress={() => setVisibility('friends')} />
      </Row>
      <Body muted>Remember: no real names, addresses, schools or phone numbers.</Body>
      <ErrorText message={error} />
      <Button label="Create project" onPress={submit} />
    </Screen>
  );
}
