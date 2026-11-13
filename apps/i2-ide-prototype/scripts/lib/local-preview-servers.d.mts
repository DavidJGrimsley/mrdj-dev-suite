import type { Plugin } from 'vite'

export declare const DEFAULT_PREFERRED_PORTS: Readonly<{ v1: number; v2: number }>
export declare function resolveSnapshotDirs(options?: {
  prototypeRoot?: string
  workspaceRoot?: string
  v1Dir?: string
  v2Dir?: string
}): { v1Dir: string; v2Dir: string }
export declare function createPreviewServersVitePlugin(options?: {
  v1Dir?: string
  v2Dir?: string
  preferredPorts?: { v1?: number; v2?: number }
  host?: string
  allowEphemeralFallback?: boolean
}): Plugin
