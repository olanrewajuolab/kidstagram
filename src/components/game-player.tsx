import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { COLS, ROWS, type RuleEvent } from '@/lib/builder';
import { gameThemes, type GameContent } from '@/lib/content';
import { KeyPad, Overlay, stageStyles as st, useKeys, useLoop, type Dir, type Phase } from './game-kit';

// Plays a game exactly the way the kid built it: their level, and only their rules.
// Nothing happens unless a rule says so (except falling off with no rule, which puts you back at the start).
// Everything below is measured in tiles.
const HERO = 0.8;
const WALK = 5;
const JUMP = 11.5;
const GRAVITY = 30;
const MAX_FALL = 15;

type Mover = { x: number; y: number; dir: 1 | -1 };
type World = {
  x: number;
  y: number;
  vy: number;
  dir: Dir;
  facing: 1 | -1;
  onGround: boolean;
  taken: Set<string>;
  movers: Mover[];
  touching: Set<string>;
  score: number;
  lives: number;
  timeLeft: number;
  timeUpFired: boolean;
  scoreFired: boolean;
  safe: number;
};

function findStart(level: string[]) {
  for (let r = 0; r < ROWS; r++) {
    const c = level[r].indexOf('S');
    if (c >= 0) return { r, c };
  }
  return { r: ROWS - 2, c: 1 };
}

export function GamePlayer({ game, onWin }: { game: GameContent; onWin?: () => void }) {
  const theme = gameThemes[game.theme] ?? gameThemes.jungle;
  const [width, setWidth] = useState(360);
  const [phase, setPhase] = useState<Phase>('ready');
  const [, setFrame] = useState(0);
  const phaseRef = useRef<Phase>('ready');
  const T = width / COLS;
  const level = game.level;

  const fresh = (): World => {
    const s = findStart(level);
    const movers: Mover[] = [];
    level.forEach((row, r) => [...row].forEach((t, c) => t === 'm' && movers.push({ x: c, y: r, dir: 1 })));
    return {
      x: s.c + 0.1, y: s.r + 0.2, vy: 0, dir: 0, facing: 1, onGround: false,
      taken: new Set(), movers, touching: new Set(), score: 0, lives: game.lives,
      timeLeft: game.timer, timeUpFired: false, scoreFired: false, safe: 0,
    };
  };
  const w = useRef<World>(fresh());

  const solid = (r: number, c: number) => {
    if (c < 0 || c >= COLS) return true;
    if (r < 0 || r >= ROWS) return false;
    return level[r][c] === '#';
  };

  const end = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    if (p === 'won') onWin?.();
  };

  const respawn = () => {
    const s = findStart(level);
    Object.assign(w.current, { x: s.c + 0.1, y: s.r + 0.2, vy: 0, safe: 1.2 });
  };

  /** Runs the kid's rules for something that just happened. */
  const fire = (event: RuleEvent, coinKey?: string) => {
    const g = w.current;
    const rules = game.rules.filter((r) => r.when === event);
    if (rules.length === 0 && event === 'fall') respawn();
    for (const rule of rules) {
      if (phaseRef.current !== 'playing') return;
      if (rule.then === 'win') return end('won');
      if (rule.then === 'lose') return end('lost');
      if (rule.then === 'lose_life') {
        g.lives -= 1;
        if (g.lives <= 0) return end('lost');
        respawn();
      }
      if (rule.then === 'add_point') {
        g.score += 1;
        if (coinKey) g.taken.add(coinKey);
        if (!g.scoreFired && g.score >= game.scoreGoal && game.rules.some((r) => r.when === 'score_is')) {
          g.scoreFired = true;
          fire('score_is');
        }
      }
    }
  };

  useLoop(phase === 'playing', (dt) => {
    if (phaseRef.current !== 'playing') return;
    const g = w.current;
    const eps = 0.001;

    // Walk left/right, stopping at blocks.
    g.x += g.dir * WALK * dt;
    for (let r = Math.floor(g.y); r <= Math.floor(g.y + HERO - eps); r++) {
      if (g.dir > 0 && solid(r, Math.floor(g.x + HERO - eps))) g.x = Math.floor(g.x + HERO - eps) - HERO;
      if (g.dir < 0 && solid(r, Math.floor(g.x))) g.x = Math.floor(g.x) + 1;
    }

    // Fall, land on blocks, bump your head.
    g.vy = Math.min(MAX_FALL, g.vy + GRAVITY * dt);
    g.y += g.vy * dt;
    g.onGround = false;
    for (let c = Math.floor(g.x); c <= Math.floor(g.x + HERO - eps); c++) {
      if (g.vy > 0 && solid(Math.floor(g.y + HERO - eps), c)) {
        g.y = Math.floor(g.y + HERO - eps) - HERO;
        g.vy = 0;
        g.onGround = true;
      } else if (g.vy < 0 && solid(Math.floor(g.y), c)) {
        g.y = Math.floor(g.y) + 1;
        g.vy = 0;
      }
    }

    // Moving enemies walk until they reach a block or an edge, then turn around.
    const sp = 1 + game.enemySpeed * 0.8;
    for (const m of g.movers) {
      const next = m.x + m.dir * sp * dt;
      const front = m.dir > 0 ? Math.floor(next + 1 - eps) : Math.floor(next);
      const floorMissing = m.y + 1 < ROWS && !solid(m.y + 1, front);
      if (solid(m.y, front) || floorMissing) m.dir = m.dir > 0 ? -1 : 1;
      else m.x = next;
    }

    // What is the hero touching? Rules fire when you first touch something.
    if (g.safe > 0) g.safe -= dt;
    const now = new Set<string>();
    const pad = 0.12;
    for (let r = Math.floor(g.y + pad); r <= Math.floor(g.y + HERO - pad); r++) {
      for (let c = Math.floor(g.x + pad); c <= Math.floor(g.x + HERO - pad); c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const t = level[r][c];
        const key = `${r},${c}`;
        if (t === '*' && !g.taken.has(key)) now.add('coin:' + key);
        if (t === 'x' && g.safe <= 0) now.add('enemy:' + key);
        if (t === 'F') now.add('flag');
      }
    }
    g.movers.forEach((m, i) => {
      if (g.safe <= 0 && Math.abs(m.x + 0.5 - (g.x + HERO / 2)) < 0.75 && Math.abs(m.y + 0.5 - (g.y + HERO / 2)) < 0.75) now.add('mover:' + i);
    });
    const touched = [...now].filter((k) => !g.touching.has(k));
    g.touching = now;
    for (const k of touched) {
      if (phaseRef.current !== 'playing') break;
      if (k.startsWith('coin:')) fire('touch_coin', k.slice(5));
      else if (k === 'flag') fire('touch_flag');
      else fire('touch_enemy');
    }

    if (phaseRef.current === 'playing' && g.y > ROWS) fire('fall');

    if (phaseRef.current === 'playing' && game.timer > 0 && !g.timeUpFired) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0) {
        g.timeLeft = 0;
        g.timeUpFired = true;
        fire('time_up');
      }
    }
    setFrame((f) => f + 1);
  });

  const start = useCallback(() => {
    w.current = fresh();
    phaseRef.current = 'playing';
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return start();
    if (w.current.onGround) w.current.vy = -JUMP;
  }, [start]);

  const move = useCallback(
    (d: Dir) => {
      if (d !== 0 && phaseRef.current !== 'playing') start();
      w.current.dir = d;
      if (d !== 0) w.current.facing = d;
    },
    [start],
  );
  useKeys(move, jump);

  // Any change to the game puts it back to the start (but not just ticking off a mission).
  const shape = JSON.stringify({ ...game, progress: null });
  useEffect(() => {
    w.current = fresh();
    phaseRef.current = 'ready';
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  const g = w.current;
  const font = { fontSize: T * 0.8, width: T, height: T, lineHeight: T, textAlign: 'center' as const, position: 'absolute' as const };
  const hasWin = game.rules.some((r) => r.then === 'win');
  const showScore = game.rules.some((r) => r.then === 'add_point');
  const showLives = game.rules.some((r) => r.then === 'lose_life');

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === 'playing' ? 'Jump' : 'Start game'}
        onPress={jump}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[st.stage, { height: T * ROWS, backgroundColor: theme.sky }]}>
        {level.map((row, r) =>
          [...row].map((t, c) => {
            if (t === '#')
              return (
                <View
                  key={`${r},${c}`}
                  style={{ position: 'absolute', left: c * T, top: r * T, width: T + 0.5, height: T + 0.5, backgroundColor: theme.ground, borderTopWidth: r > 0 && level[r - 1][c] === '#' ? 0 : 3, borderColor: 'rgba(255,255,255,0.45)' }}
                />
              );
            if (t === 'F') return <Text key={`${r},${c}`} style={[font, { left: c * T, top: r * T }]}>🏁</Text>;
            if (t === '*' && !g.taken.has(`${r},${c}`)) return <Text key={`${r},${c}`} style={[font, { left: c * T, top: r * T }]}>{game.collectible}</Text>;
            if (t === 'x') return <Text key={`${r},${c}`} style={[font, { left: c * T, top: r * T }]}>{game.obstacle}</Text>;
            return null;
          }),
        )}
        {g.movers.map((m, i) => (
          <Text key={'m' + i} style={[font, { left: m.x * T, top: m.y * T, transform: [{ scaleX: -m.dir }] }]}>{game.obstacle}</Text>
        ))}
        <Text style={[font, { left: (g.x - 0.1) * T, top: (g.y - 0.2) * T, opacity: g.safe > 0 ? 0.5 : 1, transform: [{ scaleX: -g.facing }] }]}>{game.hero}</Text>

        {(showScore || showLives || game.timer > 0) && (
          <View style={st.score}>
            <Text style={st.scoreText}>
              {showScore ? `${game.collectible} ${g.score}  ` : ''}
              {showLives ? `${'❤️'.repeat(Math.max(0, g.lives))}  ` : ''}
              {game.timer > 0 ? `⏰ ${Math.ceil(g.timeLeft)}` : ''}
            </Text>
          </View>
        )}
        <Overlay
          phase={phase}
          ready={hasWin ? 'Use ◀ ▶ to run and Jump to jump.' : 'This game has no way to win yet. Add a "You win!" rule!'}
          won={game.winMessage}
          lost="Game over! Tap to try again"
        />
      </Pressable>
      <KeyPad onMove={move} onAction={jump} actionLabel="⬆ Jump" />
    </View>
  );
}
