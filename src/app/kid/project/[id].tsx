import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Heading, Row, Screen, Title } from '@/components/kit';
import { ProjectMaker } from '@/components/project-maker';
import { colors } from '@/components/theme';
import {
  addComment,
  addHelper,
  addStep,
  getProject,
  listComments,
  listHelpers,
  listSteps,
  myFriendships,
  report,
  saveContent,
  updateProject,
} from '@/lib/api';
import { ageBand, bandRules } from '@/lib/age';
import { useAuth } from '@/lib/auth';
import { missionStatus } from '@/lib/builder';
import { readContent } from '@/lib/content';
import { findTextProblem, friendlyError, problemMessages } from '@/lib/moderation';
import { avatars, commentPresets } from '@/lib/presets';
import type { Comment, Profile, Project, Step } from '@/lib/types';

type Mini = Pick<Profile, 'id' | 'nickname' | 'avatar'>;

function ReportLink({ onReport }: { onReport: () => Promise<void> }) {
  const [done, setDone] = useState(false);
  if (done) return <Text style={{ color: colors.muted, fontSize: 13 }}>Thanks, a grown-up will check it.</Text>;
  return (
    <Pressable accessibilityRole="button" onPress={async () => { await onReport(); setDone(true); }}>
      <Text style={{ color: colors.coral, fontSize: 13, fontWeight: '700' }}>🚩 Report</Text>
    </Pressable>
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const me = profile!.id;
  const band = ageBand(profile!.birth_month!);

  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [helpers, setHelpers] = useState<Mini[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [friends, setFriends] = useState<Mini[]>([]);
  const [stepText, setStepText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, h, c] = await Promise.all([getProject(id), listSteps(id), listHelpers(id), listComments(id)]);
      setProject(p);
      setSteps(s);
      setHelpers(h);
      setComments(c);
      if (p.owner_id === me) {
        const fs = await myFriendships(me);
        setFriends(fs.filter((f) => f.status === 'accepted').map((f) => (f.requester_id === me ? f.addressee! : f.requester!)));
      }
    } catch (e) {
      setError(friendlyError((e as Error).message));
    }
  }, [id, me]);

  useEffect(() => { load(); }, [load]);

  const guard = async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); await load(); } catch (e) { setError(friendlyError((e as Error).message)); }
  };

  if (!project) return <Screen><ErrorText message={error} /></Screen>;

  const isOwner = project.owner_id === me;
  // Games can be shared once the kid has finished (and played) all their missions.
  const built = readContent(project.kind, project.content);
  const gameReady =
    built.type !== 'game' || missionStatus(profile?.birth_month ? ageBand(profile.birth_month) : 'middle', built).allDone;
  const canEdit = isOwner || helpers.some((h) => h.id === me);
  const invitable = friends.filter((f) => !helpers.some((h) => h.id === f.id));

  const postStep = () => guard(async () => {
    const problem = findTextProblem(stepText);
    if (problem) throw new Error(problemMessages[problem]);
    await addStep(id, me, (steps[steps.length - 1]?.position ?? 0) + 1, stepText.trim());
    setStepText('');
  });

  const postComment = () => guard(async () => {
    const problem = findTextProblem(commentText);
    if (problem) throw new Error(problemMessages[problem]);
    await addComment(id, me, commentText.trim());
    setCommentText('');
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: project.kind === 'game' ? 'Game' : 'Show' }} />
      <Title>{project.kind === 'game' ? '🎮' : '🎬'} {project.title}</Title>
      {project.owner && !isOwner ? <Body muted>by {avatars[project.owner.avatar]} {project.owner.nickname}</Body> : null}
      {project.description ? <Body>{project.description}</Body> : null}
      {project.moderation === 'flagged' && <Body muted>Someone reported this. A grown-up is checking it.</Body>}
      <Row>
        {isOwner ? (
          <Chip
            label={project.visibility === 'friends' ? '👫 Friends can see' : '🔒 Just me'}
            onPress={() =>
              project.visibility === 'private' && !gameReady
                ? setError('Finish all your game missions first. Then you can share your game with friends!')
                : guard(() => updateProject(id, { visibility: project.visibility === 'friends' ? 'private' : 'friends' }))
            }
          />
        ) : (
          <ReportLink onReport={() => report(me, 'project', id, 'Reported from project page')} />
        )}
      </Row>
      <ErrorText message={error} />

      <ProjectMaker
        project={project}
        canEdit={canEdit}
        onSave={async (content) => {
          try {
            await saveContent(id, content);
          } catch (e) {
            throw new Error(friendlyError((e as Error).message));
          }
          setProject({ ...project, content });
        }}
      />

      <Heading>📝 Plan and steps</Heading>
      {steps.length === 0 && <Body muted>No steps yet. What's the first thing to make?</Body>}
      {steps.map((s, i) => (
        <Card key={s.id}>
          <Text style={{ fontWeight: '800', color: colors.primary }}>Step {i + 1}</Text>
          <Body>{s.body}</Body>
          {s.author_id !== me && <ReportLink onReport={() => report(me, 'step', s.id, 'Reported step')} />}
        </Card>
      ))}
      {canEdit && (
        <>
          <Field label="Add a step" value={stepText} onChangeText={setStepText} multiline maxLength={1000} placeholder="Draw the main character" />
          <Button label="Add step" onPress={postStep} disabled={!stepText.trim()} />
        </>
      )}

      <Heading>Helpers</Heading>
      {helpers.length === 0 && <Body muted>{isOwner ? 'Invite a friend to help build this!' : 'No helpers yet.'}</Body>}
      <Row>{helpers.map((h) => <Chip key={h.id} label={`${avatars[h.avatar]} ${h.nickname}`} onPress={() => {}} />)}</Row>
      {isOwner && invitable.length > 0 && (
        <View style={{ gap: 8 }}>
          <Body muted>Tap a friend to invite them as a helper:</Body>
          <Row>
            {invitable.map((f) => (
              <Chip key={f.id} label={`+ ${avatars[f.avatar]} ${f.nickname}`} onPress={() => guard(() => addHelper(id, f.id))} />
            ))}
          </Row>
        </View>
      )}

      <Heading>Comments</Heading>
      {comments.length === 0 && <Body muted>Be the first to say something nice!</Body>}
      {comments.map((c) => (
        <Card key={c.id}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{avatars[c.author?.avatar ?? 'star']} {c.author?.nickname}</Text>
          <Body>{c.body}</Body>
          {c.author_id !== me && <ReportLink onReport={() => report(me, 'comment', c.id, 'Reported comment')} />}
        </Card>
      ))}
      {bandRules[band].freeTextComments ? (
        <>
          <Field label="Write a kind comment" value={commentText} onChangeText={setCommentText} multiline maxLength={300} />
          <Button label="Send" onPress={postComment} disabled={!commentText.trim()} />
        </>
      ) : null}
      <Body muted>{bandRules[band].freeTextComments ? 'Or tap a quick comment:' : 'Tap a comment to send it:'}</Body>
      <Row>
        {commentPresets.map((p) => (
          <Chip key={p.key} label={p.body} onPress={() => guard(() => addComment(id, me, p.body, p.key))} />
        ))}
      </Row>
    </Screen>
  );
}
