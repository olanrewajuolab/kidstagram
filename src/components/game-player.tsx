import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { gameThemes, type GameContent } from "@/lib/content";
import { colors, radius } from "./theme";

// A simple runner: jump over obstacles and grab collectibles.
// Controls: the on-screen key pad (◀ ▶ and Jump), tapping the stage, or the arrow keys / space bar.
const HEIGHT = 280;
const GROUND = 48;
const HERO_X = 40;
const SIZE = 44;
const GRAVITY = 2200;
const JUMP = 820;
const WALK = 260; // how fast the hero runs left and right (px per second)

type Thing = {
  id: number;
  x: number;
  y: number;
  kind: "obstacle" | "collectible";
  taken?: boolean;
};
type Phase = "ready" | "playing" | "won" | "lost";

export function GamePlayer({ game }: { game: GameContent }) {
  const theme = gameThemes[game.theme] ?? gameThemes.space;
  const [width, setWidth] = useState(360);
  const [phase, setPhase] = useState<Phase>("ready");
  const [, setFrame] = useState(0);

  const s = useRef({
    heroX: HERO_X,
    dir: 0,
    facing: 1,
    heroY: 0,
    vy: 0,
    things: [] as Thing[],
    score: 0,
    nextObstacle: 0,
    nextCollectible: 0,
    nextId: 1,
    decorX: 0,
  });
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const phaseRef = useRef<Phase>("ready");

  const speedPx = 170 + game.speed * 70;

  const reset = useCallback(() => {
    s.current = {
      heroX: HERO_X,
      dir: 0,
      facing: 1,
      heroY: 0,
      vy: 0,
      things: [],
      score: 0,
      nextObstacle: 1.2,
      nextCollectible: 0.6,
      nextId: 1,
      decorX: 0,
    };
  }, []);

  const end = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const tick = useCallback(
    (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000 || 0);
      last.current = now;
      const st = s.current;

      // Hero physics: run left/right with the key pad, fall back down after a jump
      st.heroX = Math.min(
        Math.max(0, st.heroX + st.dir * WALK * dt),
        Math.max(0, width - SIZE),
      );
      st.vy -= GRAVITY * dt;
      st.heroY = Math.max(0, st.heroY + st.vy * dt);
      if (st.heroY === 0) st.vy = Math.max(0, st.vy);

      // Spawn
      st.nextObstacle -= dt;
      st.nextCollectible -= dt;
      if (st.nextObstacle <= 0) {
        st.things.push({
          id: st.nextId++,
          x: width + 10,
          y: 0,
          kind: "obstacle",
        });
        st.nextObstacle = 1.0 + Math.random() * 1.3 - game.speed * 0.12;
      }
      if (st.nextCollectible <= 0) {
        st.things.push({
          id: st.nextId++,
          x: width + 10,
          y: 70 + Math.random() * 70,
          kind: "collectible",
        });
        st.nextCollectible = 0.9 + Math.random() * 1.1;
      }

      // Move and collide
      st.decorX = (st.decorX - speedPx * 0.3 * dt) % width;
      for (const t of st.things) {
        t.x -= speedPx * dt;
        const overlapX =
          t.x < st.heroX + SIZE - 10 && t.x + SIZE - 10 > st.heroX;
        const overlapY =
          st.heroY < t.y + SIZE - 12 && st.heroY + SIZE - 12 > t.y;
        if (overlapX && overlapY) {
          if (t.kind === "obstacle") {
            setFrame((f) => f + 1);
            return end("lost");
          }
          if (!t.taken) {
            t.taken = true;
            st.score += 1;
            if (st.score >= game.goal) {
              setFrame((f) => f + 1);
              return end("won");
            }
          }
        }
      }
      st.things = st.things.filter((t) => t.x > -SIZE && !t.taken);

      setFrame((f) => f + 1);
      raf.current = requestAnimationFrame(tick);
    },
    [width, speedPx, game.speed, game.goal, end],
  );

  const start = useCallback(() => {
    reset();
    phaseRef.current = "playing";
    setPhase("playing");
    last.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }, [reset, tick]);

  const jump = useCallback(() => {
    if (phaseRef.current !== "playing") return start();
    if (s.current.heroY < 4) s.current.vy = JUMP;
  }, [start]);

  // Hold ◀ or ▶ to run. Starts the game if it isn't running yet.
  const move = useCallback(
    (d: -1 | 0 | 1) => {
      if (d !== 0 && phaseRef.current !== "playing") start();
      s.current.dir = d;
      if (d !== 0) s.current.facing = d;
    },
    [start],
  );

  // Arrow keys and space bar on a real keyboard.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const typing = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) jump();
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        move(e.code === "ArrowLeft" ? -1 : 1);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (
        (e.code === "ArrowLeft" && s.current.dir === -1) ||
        (e.code === "ArrowRight" && s.current.dir === 1)
      )
        move(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [jump, move]);

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  // Restart cleanly if the settings change while the game is on screen.
  useEffect(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    phaseRef.current = "ready";
    setPhase("ready");
    reset();
  }, [game, reset]);

  const st = s.current;
  const groundTop = HEIGHT - GROUND;

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === "playing" ? "Jump" : "Start game"}
        onPress={jump}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.stage, { backgroundColor: theme.sky }]}
      >
        {[0, 1, 2, 3].map((i) => (
          <Text
            key={i}
            style={[
              styles.decor,
              {
                left: ((((i * width) / 4 + st.decorX) % width) + width) % width,
                top: 24 + (i % 2) * 40,
              },
            ]}
          >
            {theme.decor}
          </Text>
        ))}
        <View
          style={[
            styles.ground,
            { top: groundTop, backgroundColor: theme.ground },
          ]}
        />
        {st.things.map((t) => (
          <Text
            key={t.id}
            style={[styles.sprite, { left: t.x, top: groundTop - SIZE - t.y }]}
          >
            {t.kind === "obstacle" ? game.obstacle : game.collectible}
          </Text>
        ))}
        <Text
          style={[
            styles.sprite,
            {
              left: st.heroX,
              top: groundTop - SIZE - st.heroY,
              transform: [{ scaleX: -st.facing }],
            },
          ]}
        >
          {game.hero}
        </Text>

        <View style={styles.score}>
          <Text style={styles.scoreText}>
            {game.collectible} {st.score} / {game.goal}
          </Text>
        </View>

        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "ready" && <Text style={styles.big}>Tap to play!</Text>}
            {phase === "won" && (
              <Text style={styles.big}>🎉 {game.winMessage}</Text>
            )}
            {phase === "lost" && (
              <Text style={styles.big}>Oops! Tap to try again</Text>
            )}
            <Text style={styles.small}>
              {phase === "ready"
                ? `Jump over ${game.obstacle} and grab ${game.goal} ${game.collectible}. Use the buttons below!`
                : "Tap to play again"}
            </Text>
          </View>
        )}
      </Pressable>
      <KeyPad onMove={move} onJump={jump} />
    </View>
  );
}

/** On-screen controls for tablets and phones: hold ◀ ▶ to run, tap Jump to jump. */
function KeyPad({
  onMove,
  onJump,
}: {
  onMove: (d: -1 | 0 | 1) => void;
  onJump: () => void;
}) {
  const arrow = (d: -1 | 1, label: string, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPressIn={() => onMove(d)}
      onPressOut={() => onMove(0)}
      style={({ pressed }) => [styles.key, pressed && styles.keyDown]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.pad}>
      <View style={styles.arrows}>
        {arrow(-1, "◀", "Move left")}
        {arrow(1, "▶", "Move right")}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Jump button"
        onPressIn={onJump}
        style={({ pressed }) => [
          styles.key,
          styles.jumpKey,
          pressed && styles.keyDown,
        ]}
      >
        <Text style={[styles.keyText, { color: "#fff" }]}>⬆ Jump</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: HEIGHT,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
  } as object,
  ground: { position: "absolute", left: 0, right: 0, bottom: 0 },
  decor: { position: "absolute", fontSize: 22, opacity: 0.7 },
  sprite: {
    position: "absolute",
    fontSize: SIZE - 6,
    width: SIZE,
    height: SIZE,
    textAlign: "center",
    lineHeight: SIZE,
  },
  pad: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    userSelect: "none",
  } as object,
  arrows: { flexDirection: "row", gap: 12 },
  key: {
    minWidth: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  keyDown: { transform: [{ scale: 0.94 }], borderColor: colors.primary },
  jumpKey: {
    minWidth: 120,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keyText: { fontSize: 26, fontWeight: "900", color: colors.text },
  score: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 16, fontWeight: "800", color: colors.text },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 16,
    gap: 6,
  },
  big: { fontSize: 26, fontWeight: "900", color: "#fff", textAlign: "center" },
  small: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
});
