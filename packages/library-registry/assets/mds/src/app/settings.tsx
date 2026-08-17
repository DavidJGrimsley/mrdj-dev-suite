import { createURL } from 'expo-linking';

import SettingsScreen, { createPlaceholderAuthAdapter } from '@/features/settings/settings-screen';

export default function SettingsRoute() {
  return (
    <SettingsScreen
      auth={createPlaceholderAuthAdapter()}
      legalUrls={{ terms: createURL('/terms'), privacy: createURL('/privacy') }}
    />
  );
}
