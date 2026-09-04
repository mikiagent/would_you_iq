import { Redirect } from 'expo-router';

export default function EloRedirect() {
  return <Redirect href="/(tabs)/tasks?section=elo" />;
}
