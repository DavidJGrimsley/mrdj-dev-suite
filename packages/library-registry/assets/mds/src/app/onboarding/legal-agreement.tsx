import { useRouter } from 'expo-router';

import { LegalAgreementScreen } from '@/features/legal/legal-agreement-screen';

export default function OnboardingLegalAgreementRoute() {
  const router = useRouter();

  return <LegalAgreementScreen onComplete={() => router.push('/')} />;
}
