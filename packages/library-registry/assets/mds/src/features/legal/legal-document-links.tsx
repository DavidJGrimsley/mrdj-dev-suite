import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';

interface LegalDocumentLinksProps {
  orientation?: 'horizontal' | 'vertical';
  showDescription?: boolean;
}

const legalLinks = [
  {
    href: '/terms',
    label: 'Terms of Service',
    description: 'Review app usage, account, and service terms.',
  },
  {
    href: '/privacy',
    label: 'Privacy Policy',
    description: 'Review data processing, retention, and user choices.',
  },
] as const;

export function LegalDocumentLinks({
  orientation = 'vertical',
  showDescription = true,
}: LegalDocumentLinksProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <View style={[styles.group, orientation === 'horizontal' && styles.horizontal]}>
      {legalLinks.map((item) => (
        <Link key={item.href} href={item.href} asChild>
          <Pressable
            accessibilityRole="link"
            style={[
              styles.linkCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderRadius: theme.layout.radius,
              },
              orientation === 'horizontal' && styles.horizontalCard,
            ]}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
            {showDescription ? (
              <Text style={[styles.linkDescription, { color: colors.text }]}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  horizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  linkCard: {
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  horizontalCard: {
    flex: 1,
    minWidth: 180,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  linkDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
