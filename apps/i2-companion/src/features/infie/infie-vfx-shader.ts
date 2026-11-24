import * as THREE from 'three';

import type { ControllerTimingData } from './infie-assets';
import { clampIdleLoopTime, hasAllControllerClips } from './infie-state-machine';

export interface MistUniforms {
  phase: { value: number };
  mist: { value: number };
}

export function applyMistSurface(
  material: THREE.Material,
  uniforms: MistUniforms,
  recolor = true
): void {
  const mat = material as THREE.MeshStandardMaterial & { userData: Record<string, unknown> };
  const key = recolor ? 'i2-mist-recolor' : 'i2-mist';
  if (mat.userData.mistKey === key) return;
  mat.userData.mistKey = key;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.phase = uniforms.phase;
    shader.uniforms.mist = uniforms.mist;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n varying vec3 vMistWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vMistWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float phase;
        uniform float mist;
        varying vec3 vMistWorld;
        float mistHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float mistNoise(vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(mistHash(i + vec3(0,0,0)), mistHash(i + vec3(1,0,0)), f.x),
                mix(mistHash(i + vec3(0,1,0)), mistHash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(mistHash(i + vec3(0,0,1)), mistHash(i + vec3(1,0,1)), f.x),
                mix(mistHash(i + vec3(0,1,1)), mistHash(i + vec3(1,1,1)), f.x), f.y), f.z
          );
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float mBand = smoothstep(0.0, 0.25, vMistWorld.y + 0.1) * smoothstep(2.0, 1.0, vMistWorld.y);
        float mSwirl = mistNoise(vMistWorld * 2.8 + vec3(0.0, -phase * 0.45, phase * 0.25));
        float mPulse = sin(phase + vMistWorld.y * 2.4) * 0.5 + 0.5;
        vec3 mTint = vec3(0.18, 0.83, 0.75);
        totalEmissiveRadiance += mTint * mSwirl * mBand * mist * (0.28 + 0.14 * mPulse);`
      );
  };
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
}

export function applyDissolveShader(
  material: THREE.Material,
  dissolveUniform: { value: number }
): void {
  const mat = material as THREE.MeshStandardMaterial & { userData: Record<string, unknown> };
  if (mat.userData.i2Dissolve) return;
  mat.userData.i2Dissolve = true;
  mat.transparent = true;
  const previousCompile = mat.onBeforeCompile;

  mat.onBeforeCompile = (shader, renderer) => {
    previousCompile?.call(mat, shader, renderer);
    shader.uniforms.dissolve = dissolveUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n varying vec3 vDissolvePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vDissolvePos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float dissolve;
        varying vec3 vDissolvePos;
        float dHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`
      )
      .replace(
        '#include <dithering_fragment>',
        `if (dissolve > 0.001) {
          float cell = dHash(floor(vDissolvePos * 26.0));
          if (cell < dissolve) discard;
          float edge = smoothstep(dissolve, dissolve + 0.08, cell);
          gl_FragColor.rgb = mix(vec3(0.24, 0.92, 0.80), gl_FragColor.rgb, edge);
        }
        #include <dithering_fragment>`
      );
  };
  mat.customProgramCacheKey = () => `${mat.userData.mistKey ?? 'base'}-dissolve`;
  mat.needsUpdate = true;
}

export function sampleCueCurve(
  points: readonly [number, number][] | undefined,
  time: number
): number {
  if (!points || points.length === 0) return 0;
  if (time <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t0, v0] = points[i - 1];
    const [t1, v1] = points[i];
    if (time <= t1) {
      const span = Math.max(1e-5, t1 - t0);
      return v0 + ((v1 - v0) * (time - t0)) / span;
    }
  }
  return points[points.length - 1][1];
}

export class CompanionTransformationPlayer {
  readonly actions: Record<'idle' | 'to' | 'controller' | 'from', THREE.AnimationAction>;
  readonly cue = {
    dissolve: 0,
    controller_dissolve: 0,
    infie_visible: 1,
    controller_visible: 0,
    cover: 0,
    cubes: 0,
    streaks: 0,
    assembly: 0,
  };
  active = false;
  seconds = 0;
  idleSeconds = 0;
  state: 'idle' | 'transforming' | 'controller' | 'returning' = 'idle';
  readonly mixer: THREE.AnimationMixer;
  readonly timing: ControllerTimingData;

  constructor(
    mixer: THREE.AnimationMixer,
    clips: THREE.AnimationClip[],
    timing: ControllerTimingData
  ) {
    this.mixer = mixer;
    this.timing = timing;
    const find = (name: string) => clips.find((c) => c.name === name)!;
    this.actions = {
      idle: mixer.clipAction(find('INFIE_Idle')),
      to: mixer.clipAction(find('INFIE_ToController')),
      controller: mixer.clipAction(find('CONTROLLER_Idle')),
      from: mixer.clipAction(find('INFIE_FromController')),
    };
    this.actions.idle.play();
    this.actions.idle.setLoop(THREE.LoopRepeat, Infinity);
    this.actions.controller.setLoop(THREE.LoopRepeat, Infinity);
    this.actions.to.setLoop(THREE.LoopOnce, 1);
    this.actions.from.setLoop(THREE.LoopOnce, 1);
  }

  static canCreate(clips: THREE.AnimationClip[]): boolean {
    return hasAllControllerClips(clips.map((c) => c.name));
  }

  play(): boolean {
    this.active = true;
    this.seconds = 0;
    this.state = 'transforming';
    return true;
  }

  stop(): void {
    this.active = false;
    this.seconds = 0;
    this.state = 'idle';
  }

  update(dt: number): void {
    if (!this.active) {
      this.idleSeconds += dt;
      Object.values(this.actions).forEach((a) => (a.weight = 0));
      this.actions.idle.enabled = true;
      this.actions.idle.weight = 1;
      this.actions.idle.time = clampIdleLoopTime(this.idleSeconds, 6);
      this.mixer.update(0);
      this.cue.dissolve = 0;
      this.cue.controller_dissolve = 1;
      this.cue.infie_visible = 1;
      this.cue.controller_visible = 0;
      this.cue.cover = 0;
      this.cue.cubes = 0;
      this.cue.streaks = 0;
      this.cue.assembly = 0;
      return;
    }

    this.seconds += dt;
    if (this.seconds >= this.timing.duration) {
      this.stop();
      return;
    }

    const t = this.seconds;
    this.state =
      t < (this.timing.formAppearTime ?? 1.8)
        ? 'transforming'
        : t < (this.timing.formVanishTime ?? 6.2)
          ? 'controller'
          : 'returning';

    Object.values(this.actions).forEach((a) => {
      a.enabled = true;
      a.weight = 0;
    });

    if (this.state === 'transforming') {
      this.actions.to.weight = 1;
      this.actions.to.time = t;
    } else if (this.state === 'controller') {
      this.actions.controller.weight = 1;
      this.actions.controller.time = clampIdleLoopTime(
        t - (this.timing.formAppearTime ?? 1.8),
        4.0
      );
    } else {
      this.actions.from.weight = 1;
      this.actions.from.time = Math.max(0, t - (this.timing.formVanishTime ?? 6.2));
    }
    this.mixer.update(0);

    this.cue.dissolve = sampleCueCurve(this.timing.cues.dissolve, t);
    this.cue.controller_dissolve = sampleCueCurve(this.timing.cues.controller_dissolve, t);
    this.cue.infie_visible = sampleCueCurve(this.timing.cues.infie_visible, t);
    this.cue.controller_visible = sampleCueCurve(this.timing.cues.controller_visible, t);
    this.cue.cover = sampleCueCurve(this.timing.cues.cover, t);
    this.cue.cubes = sampleCueCurve(this.timing.cues.cubes, t);
    this.cue.streaks = sampleCueCurve(this.timing.cues.streaks, t);
    this.cue.assembly = sampleCueCurve(this.timing.cues.assembly, t);
  }
}

export class CompanionTransitionEffects {
  readonly group = new THREE.Group();
  readonly cubes: THREE.InstancedMesh;
  readonly streaks: THREE.Mesh[] = [];
  readonly clouds: THREE.Mesh[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly target = new THREE.Vector3();
  private readonly timing: ControllerTimingData;

  constructor(timing: ControllerTimingData) {
    this.timing = timing;
    this.group.name = 'Infie_TransitionEffects';
    this.group.visible = false;

    for (const vol of timing.mistVolumes.slice(0, 6)) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 12),
        new THREE.MeshBasicMaterial({
          color: '#2dd4bf',
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        })
      );
      mesh.position.fromArray(vol.position);
      mesh.scale.fromArray(vol.scale);
      this.clouds.push(mesh);
      this.group.add(mesh);
    }

    const cubeCount = Math.min(96, timing.cubeSeeds.length || 96);
    this.cubes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: '#78e8d8',
        emissive: '#2dd4bf',
        emissiveIntensity: 0.85,
        roughness: 0.35,
      }),
      cubeCount
    );
    this.cubes.frustumCulled = false;
    this.group.add(this.cubes);

    for (let j = 0; j < 7; j++) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 48; i++) {
        const u = i / 47;
        const a = u * Math.PI * 0.9 + j * 0.8;
        const r = 1.02 + 0.08 * j + 0.06 * Math.sin(u * 9);
        points.push(
          new THREE.Vector3(r * Math.cos(a), r * 0.65 * Math.sin(a), 0.72 - 0.15 * Math.sin(2 * a))
        );
      }
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 47, 0.008, 5, false),
        new THREE.MeshBasicMaterial({
          color: '#b5fff1',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      this.streaks.push(mesh);
      this.group.add(mesh);
    }
  }

  update(time: number, cue: CompanionTransformationPlayer['cue']): void {
    this.group.visible = cue.cover + cue.cubes + cue.streaks > 0.001;
    if (!this.group.visible) return;
    const frame = time * 30 + 1;

    this.clouds.forEach((cloud, i) => {
      const base = this.timing.mistVolumes[i]?.scale ?? [1, 1, 1];
      cloud.scale.set(base[0], base[1], base[2]).multiplyScalar(0.7 + 0.3 * cue.cover);
      (cloud.material as THREE.MeshBasicMaterial).opacity =
        0.22 * cue.cover * (this.timing.fx?.coverDensity ?? 1);
    });

    const maxCubes = Math.min(this.cubes.count, this.timing.fx?.cubeAmount ?? 96);
    for (let i = 0; i < maxCubes; i++) {
      const seed = this.timing.cubeSeeds[i];
      if (!seed) break;
      const a = seed.angle;
      const r = seed.radius;
      this.dummy.position.set(
        r * Math.cos(frame * 0.055 * seed.speed + a),
        1.05 + 0.85 * Math.sin(frame * 0.05 * seed.speed + seed.vertical),
        0.75 - 0.3 * Math.sin(frame * 0.06 + a)
      );
      this.dummy.position.lerp(this.target.fromArray(seed.target), cue.assembly);
      this.dummy.scale.setScalar(seed.size * cue.cubes);
      this.dummy.rotation.set(frame * 0.025 + a, frame * 0.025 + a + 2, -frame * 0.025 - a - 1);
      this.dummy.updateMatrix();
      this.cubes.setMatrixAt(i, this.dummy.matrix);
    }
    this.cubes.instanceMatrix.needsUpdate = true;

    this.streaks.forEach((mesh) => {
      mesh.position.y = 1.0 * cue.cover;
      mesh.rotation.z = -frame * 0.045;
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        0.65 * cue.streaks * (this.timing.fx?.streakAmount ?? 1);
    });
  }

  dispose(): void {
    this.cubes.geometry.dispose();
    (this.cubes.material as THREE.Material).dispose();
    this.clouds.forEach((c) => {
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    });
    this.streaks.forEach((s) => {
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    });
  }
}
