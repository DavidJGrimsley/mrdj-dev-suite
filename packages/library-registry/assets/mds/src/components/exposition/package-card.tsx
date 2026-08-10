import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';

interface PackageCardProps {
  title: string;
  packageName: string;
  body: string;
  children?: ReactNode;
}

export function PackageCard({ title, packageName, body, children }: PackageCardProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          borderRadius: theme.layout.radius,
        },
      ]}>
      <Text style={[styles.packageName, { color: colors.text }]}>{packageName}</Text>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontFamily: theme.typography.fontFamily,
            fontWeight:
              theme.typography.fontFamily === 'System' ||
              theme.typography.fontFamily === 'monospace'
                ? '800'
                : 'normal',
          },
        ]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{body}</Text>
      {children ? <View style={styles.demo}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  packageName: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  demo: {
    marginTop: 6,
  },
});
