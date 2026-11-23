import controllerTimingJson from '../../../assets/infie/infie-controller-timing.json';
import type { InfieFormState } from '../../types/infie';

export const INFIE_GLB_MODULES: Record<InfieFormState, number> = {
  mist: require('../../../assets/infie/infie-mist.glb'),
  glyph: require('../../../assets/infie/infie_glyph_realtime.glb'),
  surge: require('../../../assets/infie/infie_surge_realtime.glb'),
  compile: require('../../../assets/infie/infie_compile_realtime.glb'),
  controller: require('../../../assets/infie/infie-controller.glb'),
};

export interface ControllerTimingData {
  duration: number;
  fps: number;
  formAppearTime?: number;
  formVanishTime?: number;
  fx?: {
    coverDensity?: number;
    cubeAmount?: number;
    streakAmount?: number;
  };
  cues: Record<string, [number, number][]>;
  mistVolumes: {
    name?: string;
    position: [number, number, number];
    scale: [number, number, number];
  }[];
  cubeSeeds: {
    angle: number;
    radius: number;
    speed: number;
    vertical: number;
    size: number;
    target: [number, number, number];
  }[];
}

export const INFIE_CONTROLLER_TIMING = controllerTimingJson as unknown as ControllerTimingData;
