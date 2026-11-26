import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  COLS,
  ROWS,
  missionDone,
  setTile,
  type BuildState,
  type GameRule,
  type RuleAction,
  type RuleEvent,
  type Tile,
  type missionStatus,
} from '@/lib/builder';
import { collectibles, gameThemes, heroes, obstacles, type GameContent, type GameTheme } from '@/lib/content';
import { Body, Card, Chip, Row } from './kit';
import { colors, radius, space } from './theme';

type Status = ReturnType<typeof missionStatus>;

/** The mission the kid is working on, with a tick for each step. */
export function MissionCard({ status, state }: { status: Status; state: BuildState }) {
  if (status.allDone) {
    return (
      <Card style={{ backgroundColor: colors.softPurple }}>
        <Text style={styles.missionTitle}>🏆 You're a game designer!</Text>
        <Body>You finished every mission. Keep changing your game, and share it with your friends when you're ready.</Body>
      </Card>
    );
  }
  const m = status.mission!;
  return (
    <Card style={{ backgroundColor: colors.softPurple }}>
      <Text style={styles.missionKicker}>
        🎯 Mission {status.current + 1} of {status.list.length}
      </Text>
      <Text style={styles.missionTitle}>{m.title}</Text>
      {m.steps.map((s) => {
        const ok = s.done(state);
        return (
          <Text key={s.text} style={[styles.step, ok && styles.stepDone]}>
            {ok ? '✅' : '⬜'} {s.text}
          </Text>
        );
      })}
      {m.tip ? <Body muted>💡 {m.tip}</Body> : null}
      {missionDone(m, state) ? <Body>Mission complete!</Body> : null}
    </Card>
  );
}

function toolLabel(t: Tile, g: GameContent) {
  if (t === '#') return '🟫 Block';
  if (t === '.') return '🧽 Eraser';
  if (t === 'S') return `${g.hero} Start`;
  if (t === 'F') return '🏁 Flag';
  if (t === '*') return `${g.collectible} Treasure`;
  if (t === 'x') return `${g.obstacle} Enemy`;
  return `${g.obstacle}↔ Mover`;
}

/** Draw the level: pick a tool, then tap squares. */
export function LevelEditor({ game, status, onChange }: { game: GameContent; status: Status; onChange: (g: GameContent) => void }) {
  const order: Tile[] = ['#', '.', 'S', 'F', '*', 'x', 'm'];
  const tools = order.filter((t) => status.tiles.has(t));
  const [tool, setTool] = useState<Tile>('#');
  const theme = gameThemes[game.theme] ?? gameThemes.jungle;

  const paint = (r: number, c: number) => {
    const current = game.level[r][c];
    const next = current === tool && tool !== '.' ? '.' : tool; // tap again to remove
    onChange({ ...game, level: setTile(game.level, r, c, next) });
  };

  const show = (t: string) =>
    t === '#' ? null : t === 'S' ? game.hero : t === 'F' ? '🏁' : t === '*' ? game.collectible : t === 'x' ? game.obstacle : t === 'm' ? game.obstacle : null;

  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>Draw your level</Text>
      <Body muted>Pick a tool, then tap the squares. Tap a square again to clear it.</Body>
      <Row>
        {tools.map((t) => (
          <Chip key={t} label={toolLabel(t, game)} selected={tool === t} onPress={() => setTool(t)} />
        ))}
      </Row>
      <View style={[styles.grid, { aspectRatio: COLS / ROWS, backgroundColor: theme.sky }]}>
        {game.level.map((row, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
            {[...row].map((t, c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Square ${r + 1}-${c + 1}`}
                onPress={() => paint(r, c)}
                style={[styles.cell, t === '#' && { backgroundColor: theme.ground }]}>
                <Text style={styles.cellText} numberOfLines={1}>
                  {show(t)}
                  {t === 'm' ? '↔' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const eventLabel = (e: RuleEvent, g: GameContent) =>
  ({
    touch_flag: `${g.hero} touches 🏁`,
    touch_coin: `${g.hero} touches ${g.collectible}`,
    touch_enemy: `${g.hero} touches ${g.obstacle}`,
    fall: `${g.hero} falls off the bottom`,
    time_up: 'time runs out ⏰',
    score_is: `score reaches ${g.scoreGoal}`,
  })[e];

const actionLabel: Record<RuleAction, string> = {
  win: 'You win! 🎉',
  lose: 'Game over 💥',
  add_point: '+1 point',
  lose_life: 'lose a life 💔',
};

/** Picture-block rules: When … → … */
export function RuleEditor({ game, status, onChange }: { game: GameContent; status: Status; onChange: (g: GameContent) => void }) {
  const events = (['touch_flag', 'touch_coin', 'touch_enemy', 'fall', 'time_up', 'score_is'] as RuleEvent[]).filter((e) => status.events.has(e));
  const actions = (['win', 'add_point', 'lose', 'lose_life'] as RuleAction[]).filter((a) => status.actions.has(a));
  const [when, setWhen] = useState<RuleEvent | null>(null);

  const add = (then: RuleAction) => {
    if (!when) return;
    const rule: GameRule = { when, then };
    // One rule per "when": a new one replaces the old one, so rules never fight.
    onChange({ ...game, rules: [...game.rules.filter((r) => r.when !== when), rule] });
    setWhen(null);
  };

  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>Your rules</Text>
      {game.rules.length === 0 && <Body muted>No rules yet. Rules tell your game what to do.</Body>}
      {game.rules.map((r) => (
        <View key={r.when} style={styles.rule}>
          <Text style={styles.ruleText}>
            <Text style={styles.ruleWord}>When </Text>
            {eventLabel(r.when, game)}
            <Text style={styles.ruleWord}> → </Text>
            {actionLabel[r.then]}
          </Text>
          <Chip label="🗑️" onPress={() => onChange({ ...game, rules: game.rules.filter((x) => x !== r) })} />
        </View>
      ))}
      {events.length > 0 && (
        <Card>
          <Text style={styles.label}>➕ New rule. When…</Text>
          <Row>
            {events.map((e) => (
              <Chip key={e} label={eventLabel(e, game)} selected={when === e} onPress={() => setWhen(when === e ? null : e)} />
            ))}
          </Row>
          {when && (
            <>
              <Text style={styles.label}>…then:</Text>
              <Row>
                {actions.map((a) => (
                  <Chip key={a} label={actionLabel[a]} onPress={() => add(a)} />
                ))}
              </Row>
            </>
          )}
        </Card>
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
            <Text style={{ fontSize: 24 }}>{o}</Text>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

/** Timer, lives, score target and how it looks. */
export function GameSettings({ game, status, onChange }: { game: GameContent; status: Status; onChange: (g: GameContent) => void }) {
  const set = <K extends keyof GameContent>(k: K, v: GameContent[K]) => onChange({ ...game, [k]: v });
  return (
    <View style={{ gap: space.md }}>
      {status.settings.has('timer') && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.label}>Timer</Text>
          <Row>
            {[0, 15, 30, 60].map((n) => (
              <Chip key={n} label={n ? `⏰ ${n} seconds` : 'No timer'} selected={game.timer === n} onPress={() => set('timer', n)} />
            ))}
          </Row>
        </View>
      )}
      {status.settings.has('lives') && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.label}>Lives</Text>
          <Row>
            {[1, 2, 3, 5].map((n) => (
              <Chip key={n} label={'❤️'.repeat(Math.min(n, 3)) + (n > 3 ? ` ${n}` : '')} selected={game.lives === n} onPress={() => set('lives', n)} />
            ))}
          </Row>
        </View>
      )}
      {status.settings.has('scoreGoal') && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.label}>Score target</Text>
          <Row>
            {[3, 5, 8, 12].map((n) => (
              <Chip key={n} label={`${n} ${game.collectible}`} selected={game.scoreGoal === n} onPress={() => set('scoreGoal', n)} />
            ))}
          </Row>
        </View>
      )}
      {status.tiles.has('m') && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.label}>How fast do enemies move?</Text>
          <Row>
            <Chip label="🐢 Slow" selected={game.enemySpeed === 1} onPress={() => set('enemySpeed', 1)} />
            <Chip label="🐇 Medium" selected={game.enemySpeed === 2} onPress={() => set('enemySpeed', 2)} />
            <Chip label="⚡ Fast" selected={game.enemySpeed === 3} onPress={() => set('enemySpeed', 3)} />
          </Row>
        </View>
      )}
      <Picker label="Your hero" options={heroes} value={game.hero} onPick={(v) => set('hero', v)} />
      {status.tiles.has('*') && <Picker label="Treasure" options={collectibles} value={game.collectible} onPick={(v) => set('collectible', v)} />}
      {status.tiles.has('x') && <Picker label="Enemy" options={[...obstacles, '👾', '🐙', '👻'].filter((v, i, a) => a.indexOf(v) === i)} value={game.obstacle} onPick={(v) => set('obstacle', v)} />}
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>Where is it?</Text>
        <Row>
          {(Object.keys(gameThemes) as GameTheme[]).map((t) => (
            <Chip key={t} label={gameThemes[t].label} selected={game.theme === t} onPress={() => set('theme', t)} />
          ))}
        </Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Text style={styles.label}>What it says when you win</Text>
        <TextInput value={game.winMessage} onChangeText={(v) => set('winMessage', v)} maxLength={40} style={styles.input} accessibilityLabel="Winning message" />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
  missionKicker: { fontSize: 13, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  missionTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  step: { fontSize: 16, color: colors.text, fontWeight: '600' },
  stepDone: { color: '#2E7D32' },
  grid: { width: '100%', borderRadius: radius.md, overflow: 'hidden', borderWidth: 2, borderColor: colors.border },
  cell: { flex: 1, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 15 },
  rule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, padding: 10 },
  ruleText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  ruleWord: { color: colors.primary, fontWeight: '900' },
  emoji: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  emojiOn: { borderColor: colors.primary, backgroundColor: colors.softPurple },
  input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text },
});
