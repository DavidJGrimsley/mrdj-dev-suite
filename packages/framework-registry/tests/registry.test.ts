import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRAMEWORK_ID,
  UPSTREAM_REVISIONS,
  detectFrameworkFromInventory,
  getActionLabelForFramework,
  getDefaultFrameworkDescriptor,
  getFrameworkDescriptor,
  getFrameworkTemplate,
  listFrameworkDescriptors,
  listFrameworkTemplates,
} from '../src/registry.js';

describe('framework registry catalog', () => {
  it('has Exact as the default framework', () => {
    expect(DEFAULT_FRAMEWORK_ID).toBe('exact');
    const defaultDescriptor = getDefaultFrameworkDescriptor();
    expect(defaultDescriptor.id).toBe('exact');
    expect(defaultDescriptor.isDefault).toBe(true);
    expect(defaultDescriptor.displayName).toBe('Exact');
    expect(defaultDescriptor.defaultLanguage).toBe('contract');
  });

  it('keeps Expo React Native registered and selectable', () => {
    const expo = getFrameworkDescriptor('expo-react-native');
    expect(expo).toBeDefined();
    expect(expo?.id).toBe('expo-react-native');
    expect(expo?.isDefault).toBe(false);
    expect(expo?.displayName).toBe('Expo React Native');
  });

  it('lists both frameworks', () => {
    const list = listFrameworkDescriptors();
    expect(list.length).toBe(2);
    expect(list.map((f) => f.id)).toEqual(['exact', 'expo-react-native']);
  });

  it('provides appropriate action labels for user actions', () => {
    expect(getActionLabelForFramework('exact')).toBe('Generate new Exact project');
    expect(getActionLabelForFramework('expo-react-native')).toBe('Generate new Expo project');
  });

  it('includes pinned official templates for Exact', () => {
    const templates = listFrameworkTemplates('exact');
    expect(templates.length).toBe(4);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('blank');
    expect(ids).toContain('chat');
    expect(ids).toContain('landscapes');
    expect(ids).toContain('softwear');

    const chat = getFrameworkTemplate('chat', 'exact');
    expect(chat).toBeDefined();
    expect(chat?.pinnedRevision.commit).toBe(UPSTREAM_REVISIONS.CHAT_TEMPLATE.commit);
    expect(chat?.pinnedRevision.branch).toBe('chat/messages-1123');

    const landscapes = getFrameworkTemplate('landscapes', 'exact');
    expect(landscapes).toBeDefined();
    expect(landscapes?.pinnedRevision.commit).toBe(UPSTREAM_REVISIONS.LANDSCAPES_TEMPLATE.commit);

    const softwear = getFrameworkTemplate('softwear', 'exact');
    expect(softwear).toBeDefined();
    expect(softwear?.pinnedRevision.commit).toBe(UPSTREAM_REVISIONS.SOFTWEAR_TEMPLATE.commit);
  });

  it('detects frameworks safely from file inventories', () => {
    // Exact detection
    const exactDetection = detectFrameworkFromInventory([
      'app.contract',
      'app.ts',
      'exact.mjs',
      'app.test.contract',
    ]);
    expect(exactDetection.frameworkId).toBe('exact');
    expect(exactDetection.confidence).toBe('high');

    // Expo detection
    const expoDetection = detectFrameworkFromInventory([
      'package.json',
      'app.json',
      'app/_layout.tsx',
      'expo-env.d.ts',
    ]);
    expect(expoDetection.frameworkId).toBe('expo-react-native');
    expect(expoDetection.confidence).toBe('high');

    // Unknown detection
    const unknownDetection = detectFrameworkFromInventory(['README.md', 'main.py']);
    expect(unknownDetection.frameworkId).toBe('unknown');
    expect(unknownDetection.confidence).toBe('none');
  });
});
