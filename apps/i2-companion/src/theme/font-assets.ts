import { Asset } from 'expo-asset';
import { questPanelNative } from '../../modules/quest-panel/src';

export const SPACE_GROTESK_REGULAR = require('../../assets/fonts/SpaceGrotesk-Regular.ttf');
export const SPACE_GROTESK_MEDIUM = require('../../assets/fonts/SpaceGrotesk-Medium.ttf');
export const SPACE_GROTESK_BOLD = require('../../assets/fonts/SpaceGrotesk-Bold.ttf');

export const ROUNDED_MPLUS_REGULAR = require('../../assets/fonts/MPLUSRounded1c-Regular.ttf');
export const ROUNDED_MPLUS_MEDIUM = require('../../assets/fonts/MPLUSRounded1c-Medium.ttf');
export const ROUNDED_MPLUS_BOLD = require('../../assets/fonts/MPLUSRounded1c-Bold.ttf');

/**
 * Fonts required to match desktop i2-ide-prototype (424d3913):
 * Space Grotesk (display/UI) & Rounded Mplus 1c (chat/body copy).
 */
export const FONT_ASSETS: Record<string, number> = {
  'SpaceGrotesk-Regular': SPACE_GROTESK_REGULAR,
  'SpaceGrotesk-Medium': SPACE_GROTESK_MEDIUM,
  'SpaceGrotesk-SemiBold': SPACE_GROTESK_MEDIUM,
  'SpaceGrotesk-Bold': SPACE_GROTESK_BOLD,
  'Space Grotesk': SPACE_GROTESK_REGULAR,
  'Space Grotesk:Regular': SPACE_GROTESK_REGULAR,
  'Space Grotesk:Bold': SPACE_GROTESK_BOLD,
  'RoundedMplus1c-Regular': ROUNDED_MPLUS_REGULAR,
  'RoundedMplus1c-Medium': ROUNDED_MPLUS_MEDIUM,
  'RoundedMplus1c-Bold': ROUNDED_MPLUS_BOLD,
  'Rounded Mplus 1c': ROUNDED_MPLUS_REGULAR,
  'Rounded Mplus 1c:Medium': ROUNDED_MPLUS_MEDIUM,
};

let questFontsRegistered = false;

/**
 * Ensures bundled Space Grotesk & Rounded Mplus 1c TTFs are materialized and
 * registered with QuestPanelModule so Canvas drawOps render with exact desktop typography.
 */
export async function ensureQuestFontsRegistered(): Promise<void> {
  if (questFontsRegistered || !questPanelNative?.registerFont) return;
  const entries: readonly [string, number][] = [
    ['SpaceGrotesk-Regular', SPACE_GROTESK_REGULAR],
    ['SpaceGrotesk-Medium', SPACE_GROTESK_MEDIUM],
    ['SpaceGrotesk-SemiBold', SPACE_GROTESK_MEDIUM],
    ['SpaceGrotesk-Bold', SPACE_GROTESK_BOLD],
    ['RoundedMplus1c-Regular', ROUNDED_MPLUS_REGULAR],
    ['RoundedMplus1c-Medium', ROUNDED_MPLUS_MEDIUM],
    ['RoundedMplus1c-Bold', ROUNDED_MPLUS_BOLD],
  ];
  await Promise.all(
    entries.map(async ([name, mod]) => {
      try {
        const asset = Asset.fromModule(mod);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        const uri = asset.localUri ?? asset.uri;
        if (uri) {
          questPanelNative?.registerFont?.(name, uri);
        }
      } catch {
        // Android APK assets/fonts fallback in QuestPanelModule remains active.
      }
    })
  );
  questFontsRegistered = true;
}

export default FONT_ASSETS;
