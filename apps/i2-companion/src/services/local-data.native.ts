import * as SQLite from 'expo-sqlite';

import { appSnapshot } from '../data/mock-app';

import type { AppTask } from '../data/mock-app';

const dbPromise = SQLite.openDatabaseAsync('exposition.db');
let sqliteUnavailable = false;
let memoryTasks: AppTask[] = [...appSnapshot.tasks];

async function getDb() {
  if (sqliteUnavailable) {
    return null;
  }

  try {
    return await dbPromise;
  } catch {
    sqliteUnavailable = true;
    return null;
  }
}

export async function ensureLocalDataReady(): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exposition_tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL
      );
    `);
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exposition_tasks'
    );
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
  } catch {
    sqliteUnavailable = true;
  }
}

export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  const db = await getDb();
  if (!db) {
    return { ...appSnapshot, tasks: memoryTasks };
  }

  try {
    const tasks = await db.getAllAsync<AppTask>(
      'SELECT id, title, status FROM exposition_tasks ORDER BY id'
    );
    return {
      ...appSnapshot,
      tasks,
    };
  } catch {
    sqliteUnavailable = true;
    return { ...appSnapshot, tasks: memoryTasks };
  }
}

export async function addLocalTask(
  title = 'Try the local DB adapter'
): Promise<typeof appSnapshot> {
  await ensureLocalDataReady();
  const db = await getDb();
  const id = `task-${Date.now()}`;
  if (!db) {
    memoryTasks = [...memoryTasks, { id, title, status: 'todo' }];
    return { ...appSnapshot, tasks: memoryTasks };
  }

  try {
    await db.runAsync(
      'INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)',
      id,
      title,
      'todo'
    );
    return getLocalAppSnapshot();
  } catch {
    sqliteUnavailable = true;
    memoryTasks = [...memoryTasks, { id, title, status: 'todo' }];
    return { ...appSnapshot, tasks: memoryTasks };
  }
}
