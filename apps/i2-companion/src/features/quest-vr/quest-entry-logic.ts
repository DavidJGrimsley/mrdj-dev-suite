export interface QuestEntryTargetOptions {
  platformOs: string;
  deviceClass: string;
  hasVrLauncher: boolean;
  hasQuestPanel: boolean;
}

export type QuestLauncherStatus = 'idle' | 'launching' | 'immersive' | 'returned' | 'error';

/**
 * On Quest hardware, opening from the Quest library lands directly on the minimal
 * on-brand Quest launcher rather than the 2D flat CompanionShell dashboard or 2D AuthScreen.
 */
export function shouldUseQuestDirectEntry(opts: QuestEntryTargetOptions): boolean {
  if (opts.platformOs !== 'android') return false;
  return opts.deviceClass === 'quest' || opts.hasVrLauncher || opts.hasQuestPanel;
}

/**
 * User-facing copy for the minimal on-brand Quest launcher card (no technical status or counters).
 */
export function resolveQuestLauncherCopy(
  status: QuestLauncherStatus,
  hasEnteredBefore: boolean
): { ctaLabel: string; subtitle: string } {
  const isReturning = status === 'returned' || hasEnteredBefore;
  return {
    ctaLabel:
      status === 'launching'
        ? 'Entering i² VR…'
        : status === 'error'
          ? 'Try Entering i² VR'
          : isReturning
            ? 'Re-enter i² VR'
            : 'Enter i² VR',
    subtitle: isReturning
      ? 'Return to your spatial Infie & i² Home workspace whenever you are ready.'
      : 'Step into your spatial Infie & i² Home workspace.',
  };
}
