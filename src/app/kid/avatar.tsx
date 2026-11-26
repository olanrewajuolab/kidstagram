import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, ErrorText, Screen, Title } from '@/components/kit';
import { colors } from '@/components/theme';
import { setMyAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/moderation';
import { avatars } from '@/lib/presets';

/** Kids pick a new cartoon avatar. Only the ready-made ones, never photos. */
export default function ChangeAvatar() {
  const { profile, refresh } = useAuth();
  const [picked, setPicked] = useState(profile?.avatar ?? 'star');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await setMyAvatar(profile.id, picked);
      await refresh();
      router.back();
    } catch (e) {
      setError(friendlyError((e as Error).message));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 88 }}>{avatars[picked] ?? '⭐'}</Text>
        <Title>Pick your avatar</Title>
        <Body muted>Tap one you like, then save it.</Body>
      </View>
      <View style={styles.grid}>
        {Object.entries(avatars).map(([key, emoji]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Avatar ${key}`}
            accessibilityState={{ selected: picked === key }}
            onPress={() => setPicked(key)}
            style={[styles.tile, picked === key && styles.tileOn]}>
            <Text style={{ fontSize: 36 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText message={error} />
      <Button label={busy ? 'Saving…' : '💾 Save my avatar'} onPress={save} disabled={busy || picked === profile?.avatar} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tile: { width: 64, height: 64, borderRadius: 18, borderWidth: 3, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.softPurple },
});
