import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';

export default function Index() {
  const { accessToken, hydrated } = useSelector((s: RootState) => s.auth);
  if (!hydrated) return null;
  if (accessToken) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}
