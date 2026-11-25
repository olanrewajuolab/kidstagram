import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { showBackgrounds, type ShowContent } from '@/lib/content';
import { colors, radius } from './theme';

// Plays a show scene by scene. Each character says their line in turn. Tap to go on.
export function ShowPlayer({ show }: { show: ShowContent }) {
  const [scene, setScene] = useState(0);
  const [speaker, setSpeaker] = useState(0);
  const [ended, setEnded] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setScene(0);
    setSpeaker(0);
    setEnded(false);
  }, [show]);

  useEffect(() => {
    bounce.setValue(0);
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.spring(bounce, { toValue: 0, friction: 3, useNativeDriver: false }),
    ]).start();
  }, [scene, speaker, bounce]);

  const current = show.scenes[Math.min(scene, show.scenes.length - 1)];
  const bg = showBackgrounds[current.background] ?? showBackgrounds.meadow;
  const dark = current.background === 'night' || current.background === 'space' || current.background === 'stage';
  const line = current.characters[speaker]?.line;

  const next = () => {
    if (ended) {
      setScene(0);
      setSpeaker(0);
      setEnded(false);
      return;
    }
    if (speaker < current.characters.length - 1) return setSpeaker(speaker + 1);
    if (scene < show.scenes.length - 1) {
      setScene(scene + 1);
      setSpeaker(0);
      return;
    }
    setEnded(true);
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={ended ? 'Watch again' : 'Next'} onPress={next} style={[styles.stage, { backgroundColor: bg.color }]}>
      <Text style={styles.decor}>{bg.decor}</Text>
      <Text style={[styles.sceneLabel, { color: dark ? '#fff' : colors.text }]}>
        Scene {scene + 1} of {show.scenes.length}
      </Text>

      {!ended && line ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{line}</Text>
        </View>
      ) : null}

      <View style={styles.cast}>
        {current.characters.map((c, i) => {
          const talking = i === speaker && !ended;
          const lift = talking ? bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) : 0;
          return (
            <Animated.Text key={i} style={[styles.character, { opacity: talking || ended ? 1 : 0.75, transform: [{ translateY: lift }, { scale: talking ? 1.15 : 1 }] }]}>
              {c.emoji}
            </Animated.Text>
          );
        })}
      </View>

      {ended && (
        <View style={styles.overlay}>
          <Text style={styles.big}>The End 🎬</Text>
          <Text style={styles.small}>Tap to watch again</Text>
        </View>
      )}
      {!ended && <Text style={[styles.hint, { color: dark ? '#fff' : colors.muted }]}>Tap for next ▶</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { height: 300, borderRadius: radius.lg, overflow: 'hidden', padding: 16, justifyContent: 'flex-end', userSelect: 'none' } as object,
  decor: { position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontSize: 34, opacity: 0.85 },
  sceneLabel: { position: 'absolute', top: 12, left: 14, fontWeight: '800', fontSize: 13 },
  bubble: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12, maxWidth: '90%', borderWidth: 2, borderColor: colors.text },
  bubbleText: { fontSize: 19, fontWeight: '700', color: colors.text, textAlign: 'center' },
  cast: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 18 },
  character: { fontSize: 64 },
  hint: { position: 'absolute', bottom: 8, right: 14, fontSize: 12, fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', gap: 6 },
  big: { fontSize: 32, fontWeight: '900', color: '#fff' },
  small: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
