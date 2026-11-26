import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { gameThemes, type GameContent } from '@/lib/content';
import { KeyPad, Overlay, stageStyles as st, useKeys, useLoop, type Dir, type Phase } from './game-kit';

// Football: take penalties past a goalkeeper who moves along the goal line.
// Basketball: shoot into a hoop that slides from side to side.
// Move with ◀ ▶, then Kick / Shoot. Score `goal` times to win; 5 misses and it's game over.
const HEIGHT = 280;
const GROUND = 48;
const SIZE = 44;
const WALK = 280;
const MAX_MISSES = 5;
const HOOP_W = 64;

type State = {
  heroX: number;
  dir: Dir;
  ball: { x: number; y: number } | null;
  targetX: number;
  targetV: number;
  score: number;
  misses: number;
  flash: string;
  flashT: number;
};

export function ShootGame({ game }: { game: GameContent }) {
  const football = game.mode === 'football';
  const theme = gameThemes[game.theme] ?? gameThemes.jungle;
  const [width, setWidth] = useState(360);
  const [phase, setPhase] = useState<Phase>('ready');
  const [, setFrame] = useState(0);
  const targetSpeed = 60 + game.speed * 55;
  const fresh = (): State => ({ heroX: 160, dir: 0, ball: null, targetX: 140, targetV: targetSpeed, score: 0, misses: 0, flash: '', flashT: 0 });
  const s = useRef<State>(fresh());
  const phaseRef = useRef<Phase>('ready');

  // Where the goal (football) or the hoop's range (basketball) sits.
  const goalW = Math.min(280, width * 0.72);
  const goalX = (width - goalW) / 2;
  const groundTop = HEIGHT - GROUND;
  const lineY = football ? 56 : 84; // the ball is judged when it reaches this height

  const end = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useLoop(phase === 'playing', (dt) => {
    if (phaseRef.current !== 'playing') return;
    const g = s.current;
    g.heroX = Math.min(Math.max(0, g.heroX + g.dir * WALK * dt), Math.max(0, width - SIZE));

    // Move the goalkeeper / hoop and bounce at the edges.
    const minX = football ? goalX + 4 : 12;
    const maxX = football ? goalX + goalW - SIZE - 4 : width - HOOP_W - 12;
    g.targetX += g.targetV * dt;
    if (football && Math.random() < dt * 0.7) g.targetV = -g.targetV; // keepers like to dive the other way
    if (g.targetX < minX) (g.targetX = minX), (g.targetV = Math.abs(g.targetV));
    if (g.targetX > maxX) (g.targetX = maxX), (g.targetV = -Math.abs(g.targetV));

    if (g.flashT > 0) g.flashT -= dt;

    if (g.ball) {
      g.ball.y -= (520 + game.speed * 40) * dt;
      if (g.ball.y <= lineY) {
        const bx = g.ball.x + SIZE / 2;
        let scored = false;
        if (football) {
          if (bx < goalX + 8 || bx > goalX + goalW - 8) g.flash = 'Wide! 😬';
          else if (Math.abs(bx - (g.targetX + SIZE / 2)) < SIZE * 0.8) g.flash = 'Saved! 🧤';
          else (scored = true), (g.flash = 'GOAL! ⚽');
        } else if (bx > g.targetX + 4 && bx < g.targetX + HOOP_W - 4) {
          (scored = true), (g.flash = 'Swish! 🏀');
        } else g.flash = 'Missed! 😬';
        g.flashT = 0.9;
        g.ball = null;
        if (scored) g.score += 1;
        else g.misses += 1;
        if (g.score >= game.goal) return end('won');
        if (g.misses >= MAX_MISSES) return end('lost');
      }
    }
    setFrame((f) => f + 1);
  });

  const start = useCallback(() => {
    s.current = fresh();
    s.current.heroX = (width - SIZE) / 2;
    phaseRef.current = 'playing';
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, targetSpeed]);

  const shoot = useCallback(() => {
    if (phaseRef.current !== 'playing') return start();
    const g = s.current;
    if (!g.ball) g.ball = { x: g.heroX, y: groundTop - SIZE - 34 };
  }, [start, groundTop]);

  const move = useCallback(
    (d: Dir) => {
      if (d !== 0 && phaseRef.current !== 'playing') start();
      s.current.dir = d;
    },
    [start],
  );
  useKeys(move, shoot);

  useEffect(() => {
    s.current = fresh();
    phaseRef.current = 'ready';
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const g = s.current;
  const ballEmoji = football ? '⚽' : '🏀';
  const restingBall = !g.ball && phase === 'playing';

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === 'playing' ? (football ? 'Kick' : 'Shoot') : 'Start game'}
        onPress={shoot}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[st.stage, { backgroundColor: theme.sky }]}>
        {/* the pitch or court */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: groundTop, backgroundColor: theme.ground }} />
        {football ? (
          <>
            <View
              style={{
                position: 'absolute', left: goalX, width: goalW, top: 14, height: 76,
                borderWidth: 5, borderBottomWidth: 0, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)',
              }}
            />
            <Text style={[st.sprite, { left: g.targetX, top: 40 }]}>{game.obstacle}</Text>
          </>
        ) : (
          <>
            <View style={{ position: 'absolute', left: g.targetX - 8, width: HOOP_W + 16, top: 26, height: 50, backgroundColor: '#fff', borderRadius: 6, borderWidth: 3, borderColor: '#d33' }} />
            <View style={{ position: 'absolute', left: g.targetX, width: HOOP_W, top: 76, height: 12, borderRadius: 6, borderWidth: 4, borderColor: '#F26B1D' }} />
          </>
        )}
        {g.ball && <Text style={[st.sprite, { left: g.ball.x, top: g.ball.y }]}>{ballEmoji}</Text>}
        {restingBall && <Text style={[st.sprite, { left: g.heroX, top: groundTop - SIZE - 34, fontSize: 28 }]}>{ballEmoji}</Text>}
        <Text style={[st.sprite, { left: g.heroX, top: groundTop - SIZE + 4 }]}>{game.hero}</Text>
        {g.flashT > 0 && <Text style={st.flash}>{g.flash}</Text>}
        <View style={st.score}>
          <Text style={st.scoreText}>
            {ballEmoji} {g.score} / {game.goal}   ❌ {g.misses} / {MAX_MISSES}
          </Text>
        </View>
        <Overlay
          phase={phase}
          ready={
            football
              ? `Score ${game.goal} goals past ${game.obstacle}! Move with ◀ ▶ and press Kick.`
              : `Get ${game.goal} baskets! Move with ◀ ▶ and press Shoot when you're under the hoop.`
          }
          won={game.winMessage}
          lost={`${MAX_MISSES} misses! Tap to try again`}
        />
      </Pressable>
      <KeyPad onMove={move} onAction={shoot} actionLabel={football ? '⚽ Kick' : '🏀 Shoot'} />
    </View>
  );
}
