import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/kit';
import { screenOptions } from '@/components/nav';
import { useAuth } from '@/lib/auth';

export default function KidLayout() {
  const { loading, profile } = useAuth();
  if (loading) return <Loading />;
  if (profile?.role !== 'child') return <Redirect href="/" />;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Kidstagram' }} />
      <Stack.Screen name="new-project" options={{ title: 'New project' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
      <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
    </Stack>
  );
}
