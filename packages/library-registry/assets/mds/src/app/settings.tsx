import SettingsScreen, { createPlaceholderAuthAdapter } from '@/features/settings/settings-screen';

export default function SettingsRoute() {
  return (
    <SettingsScreen
      auth={createPlaceholderAuthAdapter()}
      legalUrls={{ terms: '/terms', privacy: '/privacy' }}
    />
  );
}
