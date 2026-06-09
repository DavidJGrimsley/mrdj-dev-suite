import * as SQLite from 'expo-sqlite';

import { appSnapshot } from '../data/mock-app';

import type { AppTask } from '../data/mock-app';

const dbPromise = SQLite.openDatabaseAsync('exposition.db');

async function getDb() {
  return dbPromise;
}

export async function ensureLocalDataReady(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exposition_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exposition_tasks');
  if ((row?.count ?? 0) > 0) {
    return;
  }

  for (const task of appSnapshot.tasks) {
    await db.runAsync(
      'INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)',
      task.id,
      task.title,
      task.status
    );
  }
}

export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  const db = await getDb();
  const tasks = await db.getAllAsync<AppTask>('SELECT id, title, status FROM exposition_tasks ORDER BY id');
  return {
    ...appSnapshot,
    tasks,
  };
}

export async function addLocalTask(title = 'Try the local DB adapter'): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  const db = await getDb();
  const id = `task-${Date.now()}`;
  await db.runAsync('INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)', id, title, 'todo');
  return getLocalAppSnapshot();
}
