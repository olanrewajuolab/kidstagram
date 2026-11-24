import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, maxWidth, radius, space } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title} accessibilityRole="header">{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPress();
    } finally {
      setBusy(false);
    }
  };
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={run}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.button, v.box, (disabled || busy) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      {busy ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.buttonText, v.text]}>{label}</Text>}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: colors.primaryText } },
  secondary: { box: { backgroundColor: colors.softPurple }, text: { color: colors.primary } },
  danger: { box: { backgroundColor: '#FFE8E8' }, text: { color: '#C0392B' } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
};

export function Field({ label, hint, containerStyle, ...props }: TextInputProps & { label: string; hint?: string; containerStyle?: ViewStyle }) {
  return (
    <View style={[{ gap: space.xs }, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#9AA0B8" style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={[styles.chipText, selected && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }, style]}>{children}</View>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Text style={{ color: '#9B2C2C', fontSize: 15 }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  inner: { width: '100%', maxWidth, alignSelf: 'center', padding: space.md, gap: space.md },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: space.sm },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  button: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  error: { backgroundColor: '#FFECEC', borderRadius: radius.sm, padding: 12 },
});
