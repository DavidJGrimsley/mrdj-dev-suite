import type {
  InfieBaseForm,
  InfieControllerSequencePhase,
  InfieFormState,
  InfieTransitionPhase,
} from '../../types/infie';

export interface InfieMachineState {
  /** Currently rendered GLB form on screen */
  activeAssetForm: InfieFormState;
  /** Final desired form requested by caller/demo */
  targetForm: InfieFormState;
  phase: InfieTransitionPhase;
  /** Normalized 0..1 blend/progress within current transition phase */
  phaseProgress: number;
  controllerSequenceActive: boolean;
  controllerPhase: InfieControllerSequencePhase;
  controllerElapsedSec: number;
  idleClockSec: number;
}

export const INFIE_IDLE_DURATION_SEC = 6.0;
export const INFIE_FORM_FADE_MS = 220;
export const INFIE_CONTROLLER_TOTAL_SEC = 9.0;
export const REQUIRED_CONTROLLER_CLIPS = [
  'INFIE_Idle',
  'INFIE_ToController',
  'CONTROLLER_Idle',
  'INFIE_FromController',
] as const;

export function createInitialInfieMachine(): InfieMachineState {
  return {
    activeAssetForm: 'mist',
    targetForm: 'mist',
    phase: 'steady',
    phaseProgress: 1,
    controllerSequenceActive: false,
    controllerPhase: 'idle',
    controllerElapsedSec: 0,
    idleClockSec: 0,
  };
}

/**
 * Wraps idle clip time strictly within [0, 6.0) so frame 181 (at t=6.0)
 * never double-hits frame 1 on GLB loop wrap.
 */
export function clampIdleLoopTime(seconds: number, duration = INFIE_IDLE_DURATION_SEC): number {
  if (!Number.isFinite(seconds) || duration <= 0) return 0;
  const mod = ((seconds % duration) + duration) % duration;
  return Math.min(mod, duration - 1e-4);
}

/**
 * Only dispatch TransformationPlayer when all 4 controller clips are verified present.
 */
export function hasAllControllerClips(clipNames: readonly string[]): boolean {
  return REQUIRED_CONTROLLER_CLIPS.every((required) => clipNames.includes(required));
}

/**
 * Because GLB exports freeze form_amount and Ribbon alpha at 30%, transitioning between
 * distinct forms (e.g. Glyph -> Surge) MUST pass through 'mist' as the intermediary form.
 */
export function requestInfieForm(
  state: InfieMachineState,
  nextForm: InfieFormState
): InfieMachineState {
  if (nextForm === 'controller') {
    return {
      ...state,
      activeAssetForm: 'controller',
      targetForm: 'controller',
      phase: 'controller-sequence',
      phaseProgress: 0,
      controllerSequenceActive: true,
      controllerPhase: 'idea',
      controllerElapsedSec: 0,
    };
  }

  if (state.activeAssetForm === nextForm && state.targetForm === nextForm) {
    return {
      ...state,
      phase: 'steady',
      phaseProgress: 1,
      controllerSequenceActive: false,
    };
  }

  // If leaving controller or switching directly between two non-Mist base forms, step via Mist first.
  const needsMistBridge =
    state.activeAssetForm !== 'mist' && nextForm !== 'mist' && state.activeAssetForm !== nextForm;

  if (needsMistBridge) {
    return {
      ...state,
      targetForm: nextForm,
      phase: 'fading-to-mist',
      phaseProgress: 0,
      controllerSequenceActive: false,
      controllerPhase: 'idle',
      controllerElapsedSec: 0,
    };
  }

  return {
    ...state,
    targetForm: nextForm,
    phase: nextForm === 'mist' ? 'fading-to-mist' : 'swapping-asset',
    phaseProgress: 0,
    controllerSequenceActive: false,
    controllerPhase: 'idle',
    controllerElapsedSec: 0,
  };
}

export function stepInfieMachine(state: InfieMachineState, dtSeconds: number): InfieMachineState {
  const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? Math.min(dtSeconds, 0.1) : 0;
  const idleClockSec = clampIdleLoopTime(state.idleClockSec + dt);

  if (state.phase === 'controller-sequence') {
    const elapsed = state.controllerElapsedSec + dt;
    if (elapsed >= INFIE_CONTROLLER_TOTAL_SEC) {
      return {
        ...state,
        activeAssetForm: 'mist',
        targetForm: 'mist',
        phase: 'steady',
        phaseProgress: 1,
        controllerSequenceActive: false,
        controllerPhase: 'idle',
        controllerElapsedSec: 0,
        idleClockSec,
      };
    }
    const controllerPhase: InfieControllerSequencePhase =
      elapsed < 1.0
        ? 'idle'
        : elapsed < 1.5
          ? 'idea'
          : elapsed < 4.0
            ? 'transforming'
            : elapsed < 5.8
              ? 'controller'
              : 'returning';
    return {
      ...state,
      controllerElapsedSec: elapsed,
      controllerPhase,
      phaseProgress: elapsed / INFIE_CONTROLLER_TOTAL_SEC,
      idleClockSec,
    };
  }

  if (state.phase === 'fading-to-mist') {
    const nextProgress = state.phaseProgress + (dt * 1000) / INFIE_FORM_FADE_MS;
    if (nextProgress >= 1) {
      const landed = state.targetForm === 'mist';
      return {
        ...state,
        activeAssetForm: 'mist',
        phase: landed ? 'steady' : 'swapping-asset',
        phaseProgress: landed ? 1 : 0,
        idleClockSec,
      };
    }
    return { ...state, phaseProgress: nextProgress, idleClockSec };
  }

  if (state.phase === 'swapping-asset') {
    const nextForm: InfieBaseForm = state.targetForm === 'controller' ? 'mist' : state.targetForm;
    return {
      ...state,
      activeAssetForm: nextForm,
      phase: 'revealing-target',
      phaseProgress: 0,
      idleClockSec,
    };
  }

  if (state.phase === 'revealing-target') {
    const nextProgress = state.phaseProgress + (dt * 1000) / INFIE_FORM_FADE_MS;
    if (nextProgress >= 1) {
      return {
        ...state,
        phase: 'steady',
        phaseProgress: 1,
        idleClockSec,
      };
    }
    return { ...state, phaseProgress: nextProgress, idleClockSec };
  }

  return { ...state, idleClockSec };
}

/** Gentle 3D float/sway offsets shared by Three.js Web and Viro native Infie stages. */
export function computeGentleInfieMotion(
  clockSec: number,
  reducedMotion: boolean
): { offsetY: number; rotYDeg: number; rotZDeg: number } {
  if (reducedMotion) {
    return { offsetY: 0, rotYDeg: 0, rotZDeg: 0 };
  }
  const t = clockSec;
  return {
    offsetY: Math.sin((t * Math.PI * 2) / 6) * 0.035,
    rotYDeg: Math.sin((t * Math.PI * 2) / 6) * 4.5,
    rotZDeg: Math.cos((t * Math.PI * 2) / 6) * 1.4,
  };
}
