import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { onboardingLegalDocuments } from './legal-documents';

export default function OnboardingScreen() {
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();
  const canContinue = acceptedAgreement && acceptedTerms;
  const agreementUpdated = useMemo(
    () => new Date(onboardingLegalDocuments.agreement.lastUpdated).toLocaleDateString(),
    []
  );
  const termsUpdated = useMemo(
    () => new Date(onboardingLegalDocuments.terms.lastUpdated).toLocaleDateString(),
    []
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Legal onboarding</Text>
      <Text style={styles.body}>
        Review and approve the Agreement and Terms before continuing in your real auth or profile
        flow.
      </Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.cardTitle}>Agreement</Text>
          <Text style={styles.meta}>{agreementUpdated}</Text>
        </View>
        <Text style={styles.cardBody}>
          A compact starter agreement with fill-in fields your team can finalize.
        </Text>
        <View style={styles.rowBottom}>
          <Link href="/onboarding/agreement" asChild>
            <Pressable accessibilityRole="button" style={styles.linkButton}>
              <Text style={styles.linkButtonText}>View agreement</Text>
            </Pressable>
          </Link>
          <View style={styles.acceptWrap}>
            <Text style={styles.acceptText}>Accepted</Text>
            <Switch value={acceptedAgreement} onValueChange={setAcceptedAgreement} />
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.cardTitle}>Terms of service</Text>
          <Text style={styles.meta}>{termsUpdated}</Text>
        </View>
        <Text style={styles.cardBody}>
          Production-safe baseline terms with placeholders for business specifics.
        </Text>
        <View style={styles.rowBottom}>
          <Link href="/onboarding/terms" asChild>
            <Pressable accessibilityRole="button" style={styles.linkButton}>
              <Text style={styles.linkButtonText}>View terms</Text>
            </Pressable>
          </Link>
          <View style={styles.acceptWrap}>
            <Text style={styles.acceptText}>Accepted</Text>
            <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        onPress={() => {
          if (canContinue) router.push('/onboarding/account-setup');
        }}
        style={[styles.ctaButton, !canContinue && styles.ctaButtonDisabled]}>
        <Text style={styles.ctaButtonText}>Continue to account setup</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    gap: 14,
    padding: 20,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  body: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  cardBody: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  linkButton: {
    backgroundColor: '#111827',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  acceptText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginTop: 'auto',
    paddingVertical: 14,
  },
  ctaButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
