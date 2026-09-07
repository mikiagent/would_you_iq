import { useRouter } from 'expo-router';

import { LandingScreen } from '@/components/LandingScreen';
import { landingDestination } from '@/domain/navigation';
import { useAppStore } from '@/domain/store';

export default function Index() {
  const router = useRouter();
  const completed = useAppStore((state) => state.onboarding.completed);

  return (
    <LandingScreen
      returning={completed}
      onContinue={() => router.replace(landingDestination(useAppStore.getState().onboarding.completed))}
    />
  );
}
