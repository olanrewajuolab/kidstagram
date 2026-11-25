import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  characters,
  collectibles,
  contentText,
  gameThemes,
  heroes,
  newScene,
  obstacles,
  quickLines,
  readContent,
  showBackgrounds,
  type GameContent,
  type GameTheme,
  type ProjectContent,
  type ShowBackground,
  type ShowContent,
  type ShowScene,
} from '@/lib/content';
import { findTextProblem, problemMessages } from '@/lib/moderation';
import type { Project } from '@/lib/types';
import { GamePlayer } from './game-player';
import { Body, Button, Card, Chip, ErrorText, Heading, Row } from './kit';
import { ShowPlayer } from './show-player';
import { colors, radius, space } from './theme';

type Props = {
  project: Project;
  canEdit: boolean;
  onSave: (content: ProjectContent) => Promise<void>;
};

/** The "build it" area of a project: play it, and (for the owner and helpers) change it. */
export function ProjectMaker({ project, canEdit, onSave }: Props) {
  const [content, setContent] = useState<ProjectContent>(() => readContent(project.kind, project.content));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(readContent(project.kind, project.content));
    setDirty(false);
  }, [project.id, project.kind, project.content]);

  const change = (next: ProjectContent) => {
    setContent(next);
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    setError(null);
    const problem = findTextProblem(contentText(content));
    if (problem) return setError(problemMessages[problem]);
    try {
      await onSave(content);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <Heading>{content.type === 'game' ? '🎮 Play the game' : '🎬 Watch the show'}</Heading>
      {content.type === 'game' ? <GamePlayer game={content} /> : <ShowPlayer show={content} />}

      {canEdit && (
        <>
          <Heading>🛠️ Build it</Heading>
          {content.type === 'game' ? (
            <GameEditor game={content} onChange={change} />
          ) : (
            <ShowEditor show={content} onChange={change} />
          )}
          <ErrorText message={error} />
          <Button label={dirty ? '💾 Save my changes' : saved ? '✅ Saved!' : '💾 Saved'} onPress={save} disabled={!dirty} />
        </>
      )}
    </View>
  );
}

function Picker({ label, options, value, onPick }: { label: string; options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>{label}</Text>
      <Row>
        {options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${o}`}
            accessibilityState={{ selected: o === value }}
            onPress={() => onPick(o)}
            style={[styles.emoji, o === value && styles.emojiOn]}>
            <Text style={{ fontSize: 26 }}>{o}</Text>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

function GameEditor({ game, onChange }: { game: GameContent; onChange: (g: GameContent) => void }) {
  const set = <K extends keyof GameContent>(k: K, v: GameContent[K]) => onChange({ ...game, [k]: v });
  return (
    <Card>
      <Picker label="Your hero" options={heroes} value={game.hero} onPick={(v) => set('hero', v)} />
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>Where is it?</Text>
        <Row>
          {(Object.keys(gameThemes) as GameTheme[]).map((t) => (
            <Chip key={t} label={gameThemes[t].label} selected={game.theme === t} onPress={() => set('theme', t)} />
          ))}
        </Row>
      </View>
      <Picker label="Jump over" options={obstacles} value={game.obstacle} onPick={(v) => set('obstacle', v)} />
      <Picker label="Collect" options={collectibles} value={game.collectible} onPick={(v) => set('collectible', v)} />
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>How fast?</Text>
        <Row>
          <Chip label="🐢 Slow" selected={game.speed === 1} onPress={() => set('speed', 1)} />
          <Chip label="🐇 Medium" selected={game.speed === 2} onPress={() => set('speed', 2)} />
          <Chip label="⚡ Fast" selected={game.speed === 3} onPress={() => set('speed', 3)} />
        </Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>How many to win?</Text>
        <Row>
          {[5, 10, 20, 30].map((n) => (
            <Chip key={n} label={`${n} ${game.collectible}`} selected={game.goal === n} onPress={() => set('goal', n)} />
          ))}
        </Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>What it says when you win</Text>
        <TextInput
          value={game.winMessage}
          onChangeText={(v) => set('winMessage', v)}
          maxLength={40}
          style={styles.input}
          accessibilityLabel="Winning message"
        />
      </View>
    </Card>
  );
}

function ShowEditor({ show, onChange }: { show: ShowContent; onChange: (s: ShowContent) => void }) {
  const setScene = (i: number, scene: ShowScene) => onChange({ ...show, scenes: show.scenes.map((s, j) => (j === i ? scene : s)) });
  const removeScene = (i: number) => onChange({ ...show, scenes: show.scenes.filter((_, j) => j !== i) });
  const moveScene = (i: number, d: -1 | 1) => {
    const scenes = [...show.scenes];
    [scenes[i], scenes[i + d]] = [scenes[i + d], scenes[i]];
    onChange({ ...show, scenes });
  };

  return (
    <View style={{ gap: space.md }}>
      {show.scenes.map((scene, i) => (
        <Card key={scene.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.sceneTitle}>Scene {i + 1}</Text>
            <Row>
              {i > 0 && <Chip label="⬆️" onPress={() => moveScene(i, -1)} />}
              {i < show.scenes.length - 1 && <Chip label="⬇️" onPress={() => moveScene(i, 1)} />}
              {show.scenes.length > 1 && <Chip label="🗑️ Remove" onPress={() => removeScene(i)} />}
            </Row>
          </Row>
          <Text style={styles.label}>Background</Text>
          <Row>
            {(Object.keys(showBackgrounds) as ShowBackground[]).map((b) => (
              <Chip key={b} label={showBackgrounds[b].label} selected={scene.background === b} onPress={() => setScene(i, { ...scene, background: b })} />
            ))}
          </Row>
          {scene.characters.map((ch, c) => {
            const setChar = (next: typeof ch) =>
              setScene(i, { ...scene, characters: scene.characters.map((x, k) => (k === c ? next : x)) });
            return (
              <View key={c} style={styles.character}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.label}>Character {c + 1}</Text>
                  {scene.characters.length > 1 && (
                    <Chip label="✖️" onPress={() => setScene(i, { ...scene, characters: scene.characters.filter((_, k) => k !== c) })} />
                  )}
                </Row>
                <Row>
                  {characters.map((e) => (
                    <Pressable
                      key={e}
                      accessibilityRole="button"
                      accessibilityLabel={`Character ${e}`}
                      onPress={() => setChar({ ...ch, emoji: e })}
                      style={[styles.emojiSmall, ch.emoji === e && styles.emojiOn]}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </Row>
                <TextInput
                  value={ch.line}
                  onChangeText={(v) => setChar({ ...ch, line: v })}
                  placeholder="What do they say?"
                  placeholderTextColor="#9AA0B8"
                  maxLength={80}
                  style={styles.input}
                  accessibilityLabel={`What character ${c + 1} says in scene ${i + 1}`}
                />
                <Row>
                  {quickLines.map((l) => (
                    <Pressable key={l} onPress={() => setChar({ ...ch, line: l })} style={styles.quick} accessibilityRole="button">
                      <Text style={styles.quickText}>{l}</Text>
                    </Pressable>
                  ))}
                </Row>
              </View>
            );
          })}
          {scene.characters.length < 3 && (
            <Button
              label="➕ Add a character"
              variant="secondary"
              onPress={() => setScene(i, { ...scene, characters: [...scene.characters, { emoji: '🐶', line: '' }] })}
            />
          )}
        </Card>
      ))}
      {show.scenes.length < 12 ? (
        <Button label="➕ Add a scene" variant="secondary" onPress={() => onChange({ ...show, scenes: [...show.scenes, newScene()] })} />
      ) : (
        <Body muted>That's the most scenes for one show.</Body>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
  sceneTitle: { fontSize: 18, fontWeight: '900', color: colors.primary },
  emoji: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  emojiSmall: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  emojiOn: { borderColor: colors.primary, backgroundColor: colors.softPurple },
  input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text },
  character: { gap: space.sm, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.bg },
  quick: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.softPurple },
  quickText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
