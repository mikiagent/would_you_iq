export function landingDestination(onboardingCompleted: boolean) {
  return onboardingCompleted ? '/(tabs)/calibrate' : '/onboarding';
}
