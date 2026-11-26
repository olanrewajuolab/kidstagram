import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { gameThemes, type GameContent } from '@/lib/content';
import { KeyPad, Overlay, stageStyles as st, useKeys, useLoop, type Dir, type Phase } from './game-kit';

// Catch: good things and bad things fall from the sky. Move with ◀ ▶ to catch the good ones.
const HEIGHT = 280;
const GROUND = 40;
const SIZE = 44;
const WALK = 320;

type Faller = { id: number; x: number; y: number; good: boolean };

export function CatchGame({ game }: { game: GameContent }) {
  const theme = gameThemes[game.theme] ?? gameThemes.candy;
  const [width, setWidth] = useState(360);
  const [phase, setPhase] = useState<Phase>('ready');
  const [, setFrame] = useState(0);
  const fresh = () => ({ heroX: 160, dir: 0 as Dir, things: [] as Faller[], score: 0, next: 0.4, nextId: 1 });
  const s = useRef(fresh());
  const phaseRef = useRef<Phase>('ready');
  const heroTop = HEIGHT - GROUND - SIZE;

  const end = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useLoop(phase === 'playing', (dt) => {
    if (phaseRef.current !== 'playing') return;
    const g = s.current;
    g.heroX = Math.min(Math.max(0, g.heroX + g.dir * WALK * dt), Math.max(0, width - SIZE));

    g.next -= dt;
    if (g.next <= 0) {
      g.things.push({ id: g.nextId++, x: Math.random() * Math.max(0, width - SIZE), y: -SIZE, good: Math.random() < 0.72 });
      g.next = (1.15 - game.speed * 0.17) * (0.6 + Math.random() * 0.8);
    }

    const fall = 110 + game.speed * 55 + g.score * 3;
    for (const t of g.things) {
      t.y += fall * dt;
      const hit = t.y + SIZE >= heroTop + 10 && t.y <= heroTop + SIZE - 10 && Math.abs(t.x - g.heroX) < SIZE - 10;
      if (hit) {
        if (!t.good) return end('lost');
        t.y = HEIGHT + 100; // caught: take it away
        g.score += 1;
        if (g.score >= game.goal) return end('won');
      }
    }
    g.things = g.things.filter((t) => t.y < HEIGHT);
    setFrame((f) => f + 1);
  });

  const start = useCallback(() => {
    s.current = fresh();
    s.current.heroX = (width - SIZE) / 2;
    phaseRef.current = 'playing';
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const tap = useCallback(() => {
    if (phaseRef.current !== 'playing') start();
  }, [start]);

  const move = useCallback(
    (d: Dir) => {
      if (d !== 0 && phaseRef.current !== 'playing') start();
      s.current.dir = d;
    },
    [start],
  );
  useKeys(move, tap);

  useEffect(() => {
    s.current = fresh();
    phaseRef.current = 'ready';
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const g = s.current;
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === 'playing' ? 'Catch game' : 'Start game'}
        onPress={tap}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[st.stage, { backgroundColor: theme.sky }]}>
        <Text style={{ position: 'absolute', top: 16, left: 20, fontSize: 22, opacity: 0.6 }}>{theme.decor}</Text>
        <Text style={{ position: 'absolute', top: 40, right: 60, fontSize: 22, opacity: 0.6 }}>{theme.decor}</Text>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: HEIGHT - GROUND, backgroundColor: theme.ground }} />
        {g.things.map((t) => (
          <Text key={t.id} style={[st.sprite, { left: t.x, top: t.y }]}>
            {t.good ? game.collectible : game.obstacle}
          </Text>
        ))}
        <Text style={[st.sprite, { left: g.heroX, top: heroTop }]}>{game.hero}</Text>
        <View style={st.score}>
          <Text style={st.scoreText}>
            {game.collectible} {g.score} / {game.goal}
          </Text>
        </View>
        <Overlay
          phase={phase}
          ready={`Catch ${game.goal} ${game.collectible} but dodge the ${game.obstacle}! Hold ◀ ▶ to move.`}
          won={game.winMessage}
        />
      </Pressable>
      <KeyPad onMove={move} />
    </View>
  );
}
