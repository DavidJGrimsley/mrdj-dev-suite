import {
  Viro3DObject,
  ViroAmbientLight,
  ViroDirectionalLight,
  ViroNode,
  ViroScene,
  ViroSceneNavigator,
  ViroSphere,
} from '@reactvision/react-viro';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useInfieStore } from '../../stores/infie-store';
import type { InfieFormState } from '../../types/infie';
import { INFIE_GLB_MODULES } from './infie-assets';

export interface InfieViroActorProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  enableHalo?: boolean;
}

/**
 * Pure Viro 3D sub-graph for Infie, embedded directly inside both mobile ViroSceneNavigator
 * and the Quest 3/3S QuestCockpitScene without recreating nested navigators.
 */
export function InfieViroActor({
  position = [0, 0.9, -1.6],
  scale = [0.65, 0.65, 0.65],
  enableHalo = true,
}: InfieViroActorProps) {
  const activeForm: InfieFormState = useInfieStore((s) => s.machine.activeAssetForm);
  const phase = useInfieStore((s) => s.machine.phase);
  const playing = useInfieStore((s) => s.playing);
  const vfx = useInfieStore((s) => s.vfx);
  const step = useInfieStore((s) => s.step);
  const [bobY, setBobY] = useState(0);
  const [yawDeg, setYawDeg] = useState(0);

  useEffect(() => {
    if (!playing) return;
    let t = 0;
    const id = setInterval(() => {
      const dt = 0.033;
      t += dt;
      step(dt);
      if (vfx.gentleMotionEnabled) {
        setBobY(Math.sin(t * 1.45) * 0.025);
        setYawDeg(Math.sin(t * 0.7) * 8);
      }
    }, 33);
    return () => clearInterval(id);
  }, [playing, step, vfx.gentleMotionEnabled]);

  const animationName = activeForm === 'mist' ? 'Idle' : 'INFIE_Idle';
  const haloScale = phase === 'fading-to-mist' ? 1.25 : 0.85;

  return (
    <ViroNode
      position={[position[0], position[1] + bobY, position[2]]}
      rotation={[0, yawDeg, 0]}
      scale={scale}>
      <Viro3DObject
        key={activeForm}
        source={INFIE_GLB_MODULES[activeForm]}
        type="GLB"
        animation={{
          name: animationName,
          run: playing,
          loop: true,
        }}
      />
      {enableHalo && vfx.effectsEnabled ? (
        <ViroSphere
          position={[0, 1.0, 0]}
          radius={0.14 * haloScale}
          heightSegmentCount={8}
          widthSegmentCount={8}
          opacity={0.18 * vfx.mist}
        />
      ) : null}
    </ViroNode>
  );
}

function StandaloneInfieViroScene() {
  return (
    <ViroScene>
      <ViroAmbientLight color="#9ff6ea" intensity={340} />
      <ViroDirectionalLight color="#ffffff" direction={[0.3, -1, -0.5]} intensity={650} />
      <ViroDirectionalLight color="#2dd4bf" direction={[-0.4, 0.5, 0.4]} intensity={420} />
      <InfieViroActor position={[0, -0.55, -1.9]} scale={[0.72, 0.72, 0.72]} />
    </ViroScene>
  );
}

export interface InfieStageProps {
  height?: number;
  compact?: boolean;
}

export function InfieStage({ height = 260, compact = false }: InfieStageProps) {
  const activeForm = useInfieStore((s) => s.machine.activeAssetForm);

  return (
    <View
      className="relative overflow-hidden rounded-2xl border border-teal-500/25 bg-[#07131a]"
      style={{ height }}>
      <ViroSceneNavigator initialScene={{ scene: StandaloneInfieViroScene }} style={{ flex: 1 }} />
      {!compact ? (
        <View className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1">
          <Text className="text-[11px] font-medium text-teal-200">
            Viro 3D · {activeForm.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
