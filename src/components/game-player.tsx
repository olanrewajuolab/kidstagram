import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { gameThemes, type GameContent } from '@/lib/content';
import { CatchGame } from './catch-game';
import { KeyPad, Overlay, stageStyles as st, useKeys, useLoop, type Dir, type Phase } from './game-kit';
import { ShootGame } from './shoot-game';

/** Plays a kid's game. Each kind of game has its own little engine. */
export function GamePlayer({ game }: { game: GameContent }) {
  if (game.mode === 'football' || game.mode === 'basketball') return <ShootGame game={game} />;
  if (game.mode === 'catch') return <CatchGame game={game} />;
  return <RunnerGame game={game} />;
}

// Runner: run left/right, jump over obstacles and grab collectibles.
const HEIGHT = 280;
const GROUND = 48;
const SIZE = 44;
const GRAVITY = 2200;
const JUMP = 820;
const WALK = 260;

type Thing = { id: number; x: number; y: number; kind: 'obstacle' | 'collectible'; taken?: boolean };

function RunnerGame({ game }: { game: GameContent }) {
  const theme = gameThemes[game.theme] ?? gameThemes.space;
  const [width, setWidth] = useState(360);
  const [phase, setPhase] = useState<Phase>('ready');
  const [, setFrame] = useState(0);
  const fresh = () => ({ heroX: 40, dir: 0 as Dir, facing: 1, heroY: 0, vy: 0, things: [] as Thing[], score: 0, nextObstacle: 1.2, nextCollectible: 0.6, nextId: 1, decorX: 0 });
  const s = useRef(fresh());
  const phaseRef = useRef<Phase>('ready');
  const speedPx = 170 + game.speed * 70;

  const end = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useLoop(phase === 'playing', (dt) => {
    if (phaseRef.current !== 'playing') return;
    const g = s.current;
    g.heroX = Math.min(Math.max(0, g.heroX + g.dir * WALK * dt), Math.max(0, width - SIZE));
    g.vy -= GRAVITY * dt;
    g.heroY = Math.max(0, g.heroY + g.vy * dt);
    if (g.heroY === 0) g.vy = Math.max(0, g.vy);

    g.nextObstacle -= dt;
    g.nextCollectible -= dt;
    if (g.nextObstacle <= 0) {
      g.things.push({ id: g.nextId++, x: width + 10, y: 0, kind: 'obstacle' });
      g.nextObstacle = 1.0 + Math.random() * 1.3 - game.speed * 0.12;
    }
    if (g.nextCollectible <= 0) {
      g.things.push({ id: g.nextId++, x: width + 10, y: 70 + Math.random() * 70, kind: 'collectible' });
      g.nextCollectible = 0.9 + Math.random() * 1.1;
    }

    g.decorX = (g.decorX - speedPx * 0.3 * dt) % width;
    for (const t of g.things) {
      t.x -= speedPx * dt;
      const overlapX = t.x < g.heroX + SIZE - 10 && t.x + SIZE - 10 > g.heroX;
      const overlapY = g.heroY < t.y + SIZE - 12 && g.heroY + SIZE - 12 > t.y;
      if (overlapX && overlapY) {
        if (t.kind === 'obstacle') return end('lost');
        if (!t.taken) {
          t.taken = true;
          g.score += 1;
          if (g.score >= game.goal) return end('won');
        }
      }
    }
    g.things = g.things.filter((t) => t.x > -SIZE && !t.taken);
    setFrame((f) => f + 1);
  });

  const start = useCallback(() => {
    s.current = fresh();
    phaseRef.current = 'playing';
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return start();
    if (s.current.heroY < 4) s.current.vy = JUMP;
  }, [start]);

  const move = useCallback(
    (d: Dir) => {
      if (d !== 0 && phaseRef.current !== 'playing') start();
      s.current.dir = d;
      if (d !== 0) s.current.facing = d;
    },
    [start],
  );
  useKeys(move, jump);

  // Start again cleanly if the settings change while the game is on screen.
  useEffect(() => {
    s.current = fresh();
    phaseRef.current = 'ready';
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const g = s.current;
  const groundTop = HEIGHT - GROUND;

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === 'playing' ? 'Jump' : 'Start game'}
        onPress={jump}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[st.stage, { backgroundColor: theme.sky }]}>
        {[0, 1, 2, 3].map((i) => (
          <Text key={i} style={{ position: 'absolute', fontSize: 22, opacity: 0.7, left: ((((i * width) / 4 + g.decorX) % width) + width) % width, top: 24 + (i % 2) * 40 }}>
            {theme.decor}
          </Text>
        ))}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: groundTop, backgroundColor: theme.ground }} />
        {g.things.map((t) => (
          <Text key={t.id} style={[st.sprite, { left: t.x, top: groundTop - SIZE - t.y }]}>
            {t.kind === 'obstacle' ? game.obstacle : game.collectible}
          </Text>
        ))}
        <Text style={[st.sprite, { left: g.heroX, top: groundTop - SIZE - g.heroY, transform: [{ scaleX: -g.facing }] }]}>{game.hero}</Text>
        <View style={st.score}>
          <Text style={st.scoreText}>
            {game.collectible} {g.score} / {game.goal}
          </Text>
        </View>
        <Overlay
          phase={phase}
          ready={`Jump over ${game.obstacle} and grab ${game.goal} ${game.collectible}. Use the buttons below!`}
          won={game.winMessage}
        />
      </Pressable>
      <KeyPad onMove={move} onAction={jump} actionLabel="⬆ Jump" />
    </View>
  );
}
