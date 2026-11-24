import { appSnapshot } from '../data/mock-app';

import type { AppTask } from '../data/mock-app';

let tasks: AppTask[] = [...appSnapshot.tasks];

export async function ensureLocalDataReady(): Promise<void> {
  tasks = tasks.length > 0 ? tasks : [...appSnapshot.tasks];
}

export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  return {
    ...appSnapshot,
    tasks,
  };
}

export async function addLocalTask(
  title = 'Try the local data adapter'
): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  tasks = [
    ...tasks,
    {
      id: `task-${Date.now()}`,
      title,
      status: 'todo',
    },
  ];
  return getLocalAppSnapshot();
}

export const dataAdapterNotes = [
  'This default adapter is web-safe and keeps generated apps runnable immediately.',
  'Native builds use local-data.native.ts for the Expo SQLite demo.',
  'Keep screens behind this adapter boundary so SQLite or Supabase can be swapped later.',
];
