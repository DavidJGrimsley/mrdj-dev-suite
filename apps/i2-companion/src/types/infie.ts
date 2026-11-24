export type InfieBaseForm = 'mist' | 'glyph' | 'surge' | 'compile';
export type InfieFormState = InfieBaseForm | 'controller';

export type InfieControllerSequencePhase =
  'idle' | 'idea' | 'transforming' | 'controller' | 'returning';

export type InfieTransitionPhase =
  'steady' | 'fading-to-mist' | 'swapping-asset' | 'revealing-target' | 'controller-sequence';

export interface InfieAssetSpec {
  id: InfieFormState;
  label: string;
  assetRelativePath: string;
  bytes: number;
  meshes: number;
  expectedClips: readonly string[];
  idleClipName: 'Idle' | 'INFIE_Idle';
  idleDurationSeconds: number;
  requiresMistIntermediary: boolean;
  notes: string;
}

export interface InfieVfxControls {
  gazeX: number;
  gazeY: number;
  blink: number;
  narrow: number;
  widen: number;
  glow: number;
  mist: number;
  particles: number;
  trail: number;
  effectsEnabled: boolean;
  gentleMotionEnabled: boolean;
}

export const DEFAULT_INFIE_VFX: InfieVfxControls = {
  gazeX: 0,
  gazeY: 0,
  blink: 0,
  narrow: 0,
  widen: 0,
  glow: 1,
  mist: 0.65,
  particles: 0.35,
  trail: 0.65,
  effectsEnabled: true,
  gentleMotionEnabled: true,
};
