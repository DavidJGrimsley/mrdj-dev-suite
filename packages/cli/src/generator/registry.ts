/**
 * Central framework adapter registry.
 *
 * Coordinates framework adapters for planning, validation, generation, and detection.
 * Exact is configured as the default adapter.
 */

import {
  DEFAULT_FRAMEWORK_ID,
  FrameworkError,
  type FrameworkDetectionResult,
  type FrameworkId,
  type GenerationExecutionOptions,
  type GenerationPlan,
  type GenerationPlanValidation,
  type GenerationRequest,
  type GenerationResult,
} from '@mr.dj2u/framework-registry';
import { ExactAdapter } from './exact-adapter.js';
import { ExpoReactNativeAdapter } from './expo-adapter.js';
import type { FrameworkAdapter } from './adapter-types.js';

export class FrameworkAdapterRegistry {
  private readonly adapters = new Map<string, FrameworkAdapter>();

  constructor() {
    this.register(new ExactAdapter());
    this.register(new ExpoReactNativeAdapter());
  }

  register(adapter: FrameworkAdapter): void {
    this.adapters.set(adapter.descriptor.id, adapter);
  }

  getAdapter(id: FrameworkId): FrameworkAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new FrameworkError({
        code: 'FRAMEWORK_NOT_FOUND',
        message: `No generator adapter registered for framework "${id}".`,
        actionableFix: `Select a supported framework: ${Array.from(this.adapters.keys()).join(', ')}.`,
      });
    }
    return adapter;
  }

  getDefaultAdapter(): FrameworkAdapter {
    return this.getAdapter(DEFAULT_FRAMEWORK_ID);
  }

  listAdapters(): readonly FrameworkAdapter[] {
    return Array.from(this.adapters.values());
  }

  async detectFramework(projectPath: string): Promise<FrameworkDetectionResult> {
    const detections = await Promise.all(this.listAdapters().map(adapter => adapter.detect(projectPath)));
    const candidates = detections.filter(d => d.confidence !== 'none' && d.frameworkId !== 'unknown');
    if (candidates.length > 1) return {frameworkId:'unknown',confidence:'low',matchedSignals:candidates.flatMap(d => d.matchedSignals),ambiguityNote:`Mixed/ambiguous framework signals: ${candidates.map(d => d.frameworkId).join(', ')}`};
    return candidates[0] ?? {frameworkId:'unknown',confidence:'none',matchedSignals:[]};
  }

  async planGeneration(request: GenerationRequest): Promise<GenerationPlan> {
    const frameworkId = request.frameworkId || DEFAULT_FRAMEWORK_ID;
    const adapter = this.getAdapter(frameworkId);
    return adapter.planGeneration(request);
  }

  async validatePlan(plan: GenerationPlan): Promise<GenerationPlanValidation> {
    const adapter = this.getAdapter(plan.frameworkId);
    return adapter.validatePlan(plan);
  }

  async generate(
    plan: GenerationPlan,
    options: GenerationExecutionOptions
  ): Promise<GenerationResult> {
    const adapter = this.getAdapter(plan.frameworkId);
    return adapter.generate(plan, options);
  }
}

let defaultRegistryInstance: FrameworkAdapterRegistry | null = null;

export function getFrameworkAdapterRegistry(): FrameworkAdapterRegistry {
  if (!defaultRegistryInstance) {
    defaultRegistryInstance = new FrameworkAdapterRegistry();
  }
  return defaultRegistryInstance;
}
