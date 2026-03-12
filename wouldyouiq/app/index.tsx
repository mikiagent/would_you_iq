import { Redirect } from 'expo-router';

export default function Index() {
  // Default web path ("/") should go to onboarding
  return <Redirect href="/onboarding" />;
}

