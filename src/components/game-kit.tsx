import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export type Dir = -1 | 0 | 1;
export type Phase = 'ready' | 'playing' | 'won' | 'lost';

/** On-screen controls for tablets and phones: hold ◀ ▶ to move, tap the big button for the action. */
export function KeyPad({ onMove, onAction, actionLabel }: { onMove: (d: Dir) => void; onAction?: () => void; actionLabel?: string }) {
  // Very quick taps can finish before "press in" fires, so the action also runs on "press" if it hasn't yet.
  const actedOnPressIn = useRef(false);
  const arrow = (d: -1 | 1, label: string, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPressIn={() => onMove(d)}
      onPressOut={() => onMove(0)}
      style={({ pressed }) => [styles.key, pressed && styles.keyDown]}>
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.pad}>
      <View style={styles.arrows}>
        {arrow(-1, '◀', 'Move left')}
        {arrow(1, '▶', 'Move right')}
      </View>
      {onAction && actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel.replace(/^\W+\s*/, '')} button`}
          onPressIn={() => {
            actedOnPressIn.current = true;
            onAction();
          }}
          onPress={() => {
            if (!actedOnPressIn.current) onAction();
            actedOnPressIn.current = false;
          }}
          style={({ pressed }) => [styles.key, styles.actionKey, pressed && styles.keyDown]}>
          <Text style={[styles.keyText, { color: '#fff' }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Arrow keys move, space bar / up arrow does the action. Ignored while typing in a box. */
export function useKeys(onMove: (d: Dir) => void, onAction?: () => void) {
  const dir = useRef<Dir>(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const typing = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!e.repeat) onAction?.();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        dir.current = e.code === 'ArrowLeft' ? -1 : 1;
        onMove(dir.current);
      }
    };
    const up = (e: KeyboardEvent) => {
      if ((e.code === 'ArrowLeft' && dir.current === -1) || (e.code === 'ArrowRight' && dir.current === 1)) {
        dir.current = 0;
        onMove(0);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onMove, onAction]);
}

/** Runs `tick(dt)` every animation frame while `running` is true. dt is in seconds. */
export function useLoop(running: boolean, tick: (dt: number) => void) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      tickRef.current(dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/** The "Tap to play" / win / lose cover shown over every game when it isn't running. */
export function Overlay({ phase, ready, won, lost = 'Oops! Tap to try again' }: { phase: Phase; ready: string; won: string; lost?: string }) {
  if (phase === 'playing') return null;
  return (
    <View style={stageStyles.overlay}>
      {phase === 'ready' && <Text style={stageStyles.big}>Tap to play!</Text>}
      {phase === 'won' && <Text style={stageStyles.big}>🎉 {won}</Text>}
      {phase === 'lost' && <Text style={stageStyles.big}>{lost}</Text>}
      <Text style={stageStyles.small}>{phase === 'ready' ? ready : 'Tap to play again'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' } as object,
  arrows: { flexDirection: 'row', gap: 12 },
  key: { minWidth: 72, height: 72, borderRadius: 20, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  keyDown: { transform: [{ scale: 0.94 }], borderColor: colors.primary },
  actionKey: { minWidth: 120, backgroundColor: colors.primary, borderColor: colors.primary },
  keyText: { fontSize: 26, fontWeight: '900', color: colors.text },
});

export const stageStyles = StyleSheet.create({
  stage: { height: 280, borderRadius: 18, overflow: 'hidden', position: 'relative', userSelect: 'none' } as object,
  sprite: { position: 'absolute', fontSize: 38, width: 44, height: 44, textAlign: 'center', lineHeight: 44 },
  score: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  scoreText: { fontSize: 16, fontWeight: '800', color: colors.text },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 16, gap: 6 },
  big: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  small: { fontSize: 15, fontWeight: '600', color: '#fff', textAlign: 'center' },
  flash: { position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', fontSize: 30, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 } as object,
});
