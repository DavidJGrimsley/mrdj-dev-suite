import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { SEEDED_FILES } from '../../data/seeded-workspace';
import { useInfieStore } from '../../stores/infie-store';
import type { InfieFormState } from '../../types/infie';
import { INFIE_CONTROLLER_TIMING, INFIE_GLB_MODULES } from './infie-assets';
import { clampIdleLoopTime, INFIE_IDLE_DURATION_SEC } from './infie-state-machine';
import {
  CompanionTransformationPlayer,
  CompanionTransitionEffects,
  applyDissolveShader,
  applyMistSurface,
  type MistUniforms,
} from './infie-vfx-shader';

export interface InfieStageProps {
  height?: number;
  compact?: boolean;
}

const _ignored = SEEDED_FILES;
void _ignored;

export function InfieStage({ height = 280, compact = false }: InfieStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const machine = useInfieStore((s) => s.machine);
  const vfx = useInfieStore((s) => s.vfx);
  const playing = useInfieStore((s) => s.playing);
  const step = useInfieStore((s) => s.step);

  const [statusLabel, setStatusLabel] = useState<string>('Loading 3D Infie…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const latestRef = useRef({ vfx, playing, machine, step });
  useEffect(() => {
    latestRef.current = { vfx, playing, machine, step };
  });

  const activeAssetForm: InfieFormState = machine.activeAssetForm;

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let dead = false;
    let rafId = 0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#07131a', 0.045);

    const width = Math.max(container.clientWidth || 320, 240);
    const viewHeight = Math.max(container.clientHeight || height, 180);

    const camera = new THREE.PerspectiveCamera(36, width / viewHeight, 0.1, 40);
    camera.position.set(0.35, 1.38, 3.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, viewHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, viewHeight), 0.24, 0.45, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.target.set(0, 1.05, 0);
    controls.minDistance = 1.8;
    controls.maxDistance = 5.5;

    const ambient = new THREE.AmbientLight('#8be9dc', 0.85);
    const key = new THREE.DirectionalLight('#ffffff', 1.9);
    key.position.set(2.4, 3.8, 3.2);
    const rim = new THREE.DirectionalLight('#2dd4bf', 1.4);
    rim.position.set(-2.6, 1.8, -2.0);
    scene.add(ambient, key, rim);

    const uniforms: MistUniforms = {
      phase: { value: 0 },
      mist: { value: 0.65 },
    };
    const infieDissolve = { value: 0 };
    const controllerDissolve = { value: 1 };

    let character: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let clipAction: THREE.AnimationAction | null = null;
    let player: CompanionTransformationPlayer | null = null;
    let transitionFx: CompanionTransitionEffects | null = null;
    let motes: THREE.Points | null = null;
    const trails: THREE.Mesh[] = [];
    const haze: THREE.Mesh[] = [];
    const eyes: { control: THREE.Object3D; position: THREE.Vector3; scale: THREE.Vector3 }[] = [];
    const emissive: { material: THREE.MeshStandardMaterial; strength: number; pulse: boolean }[] =
      [];

    const moteCount = 96;
    const motePos = new Float32Array(moteCount * 3);
    const moteAlpha = new Float32Array(moteCount);

    let disposedResources: { dispose: () => void }[] = [];

    (async () => {
      try {
        setErrorMsg(null);
        setStatusLabel(`Loading ${activeAssetForm}.glb…`);
        const asset = Asset.fromModule(INFIE_GLB_MODULES[activeAssetForm]);
        await asset.downloadAsync();
        if (dead) return;
        const url = asset.localUri ?? asset.uri;
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        if (dead) return;

        character = gltf.scene;
        character.name = `Infie_${activeAssetForm}`;
        scene.add(character);

        character.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial;
            if (!std) continue;
            disposedResources.push(std);
            const name = obj.name.toLowerCase();
            if (activeAssetForm === 'mist' || name.includes('core') || name.includes('mist')) {
              applyMistSurface(std, uniforms, activeAssetForm === 'mist');
            }
            if (activeAssetForm === 'controller') {
              applyDissolveShader(
                std,
                name.includes('controller') ? controllerDissolve : infieDissolve
              );
            }
            if (std.emissive && std.emissiveIntensity > 0) {
              emissive.push({
                material: std,
                strength: std.emissiveIntensity,
                pulse:
                  name.includes('controller') || name.includes('surge') || name.includes('core'),
              });
            }
          }
          if (mesh.geometry) disposedResources.push(mesh.geometry);
        });

        for (const eyeName of ['EyeControl_L', 'EyeControl_R']) {
          const ctrl = character.getObjectByName(eyeName);
          if (ctrl) {
            eyes.push({
              control: ctrl,
              position: ctrl.position.clone(),
              scale: ctrl.scale.clone(),
            });
          }
        }

        const core = character.getObjectByName('Infinity_Core') as THREE.Mesh | undefined;
        if (core && core.parent) {
          for (let i = 0; i < 2; i++) {
            const mat = new THREE.MeshStandardMaterial({
              color: '#2DD4BF',
              emissive: '#2DD4BF',
              emissiveIntensity: 0.6,
              transparent: true,
              opacity: 0.06,
              depthWrite: false,
              roughness: 1,
            });
            applyMistSurface(mat, uniforms, false);
            const ghost = new THREE.Mesh(core.geometry, mat);
            ghost.morphTargetInfluences = core.morphTargetInfluences;
            ghost.morphTargetDictionary = core.morphTargetDictionary;
            ghost.scale.copy(core.scale);
            core.parent.add(ghost);
            trails.push(ghost);
            disposedResources.push(mat);
          }

          const hazeMat = new THREE.MeshStandardMaterial({
            color: '#2DD4BF',
            emissive: '#2DD4BF',
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.055,
            depthWrite: false,
            roughness: 1,
          });
          applyMistSurface(hazeMat, uniforms, false);
          const shell = new THREE.Mesh(core.geometry, hazeMat);
          shell.morphTargetInfluences = core.morphTargetInfluences;
          shell.scale.copy(core.scale).multiplyScalar(1.018);
          core.parent.add(shell);
          haze.push(shell);
          disposedResources.push(hazeMat);
        }

        const moteGeo = new THREE.BufferGeometry();
        moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
        moteGeo.setAttribute('fade', new THREE.BufferAttribute(moteAlpha, 1));
        const moteMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
          vertexShader:
            'attribute float fade; varying float vFade; uniform float pixelRatio; void main(){ vFade=fade; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=5.0*pixelRatio; }',
          fragmentShader:
            'varying float vFade; void main(){ float r=length(gl_PointCoord-.5); float a=smoothstep(.5,.08,r)*vFade; gl_FragColor=vec4(.18,.85,.70,a); }',
        });
        motes = new THREE.Points(moteGeo, moteMat);
        motes.frustumCulled = false;
        character.add(motes);
        disposedResources.push(moteGeo, moteMat);

        mixer = new THREE.AnimationMixer(character);
        if (
          activeAssetForm === 'controller' &&
          CompanionTransformationPlayer.canCreate(gltf.animations)
        ) {
          player = new CompanionTransformationPlayer(
            mixer,
            gltf.animations,
            INFIE_CONTROLLER_TIMING
          );
          player.play();
          transitionFx = new CompanionTransitionEffects(INFIE_CONTROLLER_TIMING);
          scene.add(transitionFx.group);
        } else if (gltf.animations.length > 0) {
          const preferred =
            gltf.animations.find((a) => a.name === 'Idle' || a.name === 'INFIE_Idle') ??
            gltf.animations[0];
          clipAction = mixer.clipAction(preferred);
          clipAction.play();
        }

        setStatusLabel(`3D ${activeAssetForm.toUpperCase()} active`);
        Object.assign(window, {
          __infieCompanion: {
            form: activeAssetForm,
            clips: gltf.animations.map((a) => a.name),
          },
        });
      } catch (err) {
        if (!dead) {
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setStatusLabel('3D load error');
        }
      }
    })();

    const observer = new ResizeObserver(() => {
      if (!container || dead) return;
      const w = Math.max(container.clientWidth || 320, 240);
      const h = Math.max(container.clientHeight || height, 180);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    });
    observer.observe(container);

    let lastNow = performance.now();
    let localSec = 0;

    function tick(now: number) {
      if (dead) return;
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      const cur = latestRef.current;
      const stepDt = cur.playing ? dt : 0;
      localSec += stepDt;
      if (stepDt > 0) cur.step(stepDt);

      for (const e of eyes) {
        e.control.position.copy(e.position);
        e.control.scale.copy(e.scale);
      }

      if (player) {
        player.update(stepDt);
        infieDissolve.value = player.cue.dissolve;
        controllerDissolve.value = player.cue.controller_dissolve;
        const infieRoot = character?.getObjectByName('Infie_Transform');
        const ctrlRoot = character?.getObjectByName('Controller_Root');
        if (infieRoot) infieRoot.visible = player.cue.infie_visible > 0.001;
        if (ctrlRoot) ctrlRoot.visible = player.cue.controller_visible > 0.001;
        transitionFx?.update(player.active ? player.seconds : 0, player.cue);
      } else if (mixer && clipAction) {
        clipAction.time = clampIdleLoopTime(localSec, INFIE_IDLE_DURATION_SEC);
        mixer.update(0);
      }

      const t = player ? (player.active ? player.seconds : player.idleSeconds) : localSec;
      uniforms.phase.value = (t / INFIE_IDLE_DURATION_SEC) * Math.PI * 2;
      uniforms.mist.value = cur.vfx.effectsEnabled ? cur.vfx.mist : 0;

      if (character && cur.vfx.gentleMotionEnabled) {
        character.position.y = Math.sin(t * 1.45) * 0.032;
        character.rotation.y = Math.sin(t * 0.72) * 0.14;
      }

      const fadeOpacity =
        cur.machine.phase === 'fading-to-mist'
          ? 1 - cur.machine.phaseProgress * 0.72
          : cur.machine.phase === 'revealing-target'
            ? 0.28 + cur.machine.phaseProgress * 0.72
            : 1;
      renderer.domElement.style.opacity = String(Math.max(0.2, Math.min(1, fadeOpacity)));

      for (const e of eyes) {
        e.position.copy(e.control.position);
        e.scale.copy(e.control.scale);
        e.control.position.x += cur.vfx.gazeX;
        e.control.position.y += cur.vfx.gazeY;
        e.control.scale.y *= Math.max(
          0.025,
          (1 - cur.vfx.blink) * (1 - 0.6 * cur.vfx.narrow) * (1 + 0.5 * cur.vfx.widen)
        );
      }

      const fxOn = cur.vfx.effectsEnabled;
      bloom.enabled = fxOn;
      bloom.strength = 0.24 * cur.vfx.glow;
      emissive.forEach(({ material, strength, pulse }) => {
        const pulseScale = pulse ? 1 + 0.15 * Math.sin(((t - 4) / 6) * Math.PI * 2) ** 2 : 1;
        material.emissiveIntensity = strength * cur.vfx.glow * pulseScale;
      });

      trails.forEach((o, i) => {
        o.visible = fxOn;
        o.position.set(
          0.035 * (i + 1) * Math.sin(uniforms.phase.value - 0.4),
          -0.025 * (i + 1),
          -0.14 * (i + 1)
        );
        (o.material as THREE.MeshStandardMaterial).opacity = (cur.vfx.trail * 0.09) / (i + 1);
      });
      haze.forEach((o) => {
        o.visible = fxOn;
        (o.material as THREE.MeshStandardMaterial).opacity = cur.vfx.mist * 0.075;
      });

      if (motes) {
        motes.visible = fxOn;
        const active = Math.round(moteCount * cur.vfx.particles);
        for (let i = 0; i < moteCount; i++) {
          const life = (t / INFIE_IDLE_DURATION_SEC + ((i * 0.61803398875) % 1)) % 1;
          const angle = i * 2.399963 + life * 5;
          const radius = 0.6 * (1 - life) + 0.05;
          motePos[i * 3] = radius * Math.cos(angle) + 0.12 * Math.sin(life * 7);
          motePos[i * 3 + 1] = 0.85 + (0.5 - life * 1.4);
          motePos[i * 3 + 2] = -radius * 0.6 * Math.sin(angle);
          moteAlpha[i] = i < active ? Math.sin(Math.PI * life) ** 2 * 0.7 : 0;
        }
        motes.geometry.attributes.position.needsUpdate = true;
        motes.geometry.attributes.fade.needsUpdate = true;
      }

      controls.update();
      composer.render();
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      dead = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      controls.dispose();
      if (character) {
        mixer?.stopAllAction();
        mixer?.uncacheRoot(character);
      }
      transitionFx?.dispose();
      disposedResources.forEach((r) => r.dispose());
      disposedResources = [];
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [activeAssetForm, height]);

  return (
    <View
      className="relative overflow-hidden rounded-2xl border border-teal-500/25 bg-[#07131a]"
      style={{ height }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      {!compact ? (
        <View className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1">
          <Text className="text-[11px] font-medium text-teal-200">{statusLabel}</Text>
        </View>
      ) : null}
      {errorMsg ? (
        <View className="absolute inset-x-3 bottom-3 rounded-lg bg-rose-950/90 p-2">
          <Text className="text-xs text-rose-200">{errorMsg}</Text>
        </View>
      ) : null}
    </View>
  );
}
