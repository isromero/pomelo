import { Redirect } from 'expo-router';

export default function MapCompatibilityRoute() {
  return <Redirect href="/diary?view=map" />;
}
