/**
 * Structured event reporting and cancellation primitives for framework generation.
 *
 * Browser-safe and compatible with any UI, stream, or IPC progress channel.
 */

import { GenerationCancelledError } from './errors.js';
import type { CancellationTokenLike, GenerationProgressEvent } from './types.js';

export class CancellationToken implements CancellationTokenLike {
  private _cancelled = false;
  private _reason?: string;

  get isCancelled(): boolean {
    return this._cancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason = 'Operation was cancelled.'): void {
    this._cancelled = true;
    this._reason = reason;
  }

  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new GenerationCancelledError(this._reason);
    }
  }
}

export function createProgressEvent(
  type: GenerationProgressEvent['type'],
  message: string,
  options?: {
    step?: number;
    totalSteps?: number;
    details?: Record<string, unknown>;
  }
): GenerationProgressEvent {
  const percent =
    options?.step !== undefined && options?.totalSteps !== undefined && options.totalSteps > 0
      ? Math.round((options.step / options.totalSteps) * 100)
      : undefined;

  return {
    type,
    timestamp: new Date().toISOString(),
    message,
    step: options?.step,
    totalSteps: options?.totalSteps,
    percent,
    details: options?.details,
  };
}
