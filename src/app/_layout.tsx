import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { screenOptions } from '@/components/nav';
import { AuthProvider } from '@/lib/auth';


export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="parent-sign-up" options={{ title: 'Grown-up sign up' }} />
        <Stack.Screen name="parent-sign-in" options={{ title: 'Grown-up sign in' }} />
        <Stack.Screen name="kid-sign-in" options={{ title: 'Kid sign in' }} />
        <Stack.Screen name="parent" options={{ headerShown: false }} />
        <Stack.Screen name="kid" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
