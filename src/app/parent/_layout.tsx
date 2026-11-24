import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/kit';
import { screenOptions } from '@/components/nav';
import { useAuth } from '@/lib/auth';

export default function ParentLayout() {
  const { loading, profile } = useAuth();
  if (loading) return <Loading />;
  if (profile?.role !== 'parent') return <Redirect href="/" />;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Parent dashboard' }} />
      <Stack.Screen name="consent" options={{ title: 'Parental consent' }} />
      <Stack.Screen name="add-child" options={{ title: 'Add a child' }} />
      <Stack.Screen name="child/[id]" options={{ title: 'Child' }} />
    </Stack>
  );
}
