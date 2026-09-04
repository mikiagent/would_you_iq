import { Redirect } from 'expo-router';

export default function SyllabusRedirect() {
  return <Redirect href="/(tabs)/tasks?section=context" />;
}
