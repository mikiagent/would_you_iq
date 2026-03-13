import { Redirect } from 'expo-router';

import { useAppStore } from '@/domain/store';

export default function Index() {
  const completed = useAppStore((state) => state.onboarding.completed);

  return <Redirect href={completed ? '/(tabs)/calibrate' : '/onboarding'} />;
}
