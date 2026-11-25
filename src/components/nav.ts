import { colors } from './theme';

export const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '800' as const, color: colors.text },
  contentStyle: { backgroundColor: colors.bg },
};
