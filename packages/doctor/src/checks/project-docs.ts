import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { firstExistingPath } from '../utils.js';

export async function checkProjectDocs(projectPath: string): Promise<DoctorCheckResult> {
  const projectDir = path.join(projectPath, 'project');
  const docs = [
    { label: 'info.md', paths: [path.join(projectDir, 'info.md')], required: true },
    {
      label: 'todo.md',
      paths: [path.join(projectDir, 'todo.md'), path.join(projectDir, 'TODO.md')],
      required: true,
    },
    { label: 'guidelines.md', paths: [path.join(projectDir, 'guidelines.md')], required: true },
    { label: 'style.md', paths: [path.join(projectDir, 'style.md')], required: false },
  ];

  const missing: string[] = [];
  const empty: string[] = [];

  for (const doc of docs) {
    const filePath = await firstExistingPath(doc.paths);
    if (!filePath) {
      if (doc.required) {
        missing.push(doc.label);
      }
      continue;
    }

    const contents = await readFile(filePath, 'utf8');
    if (contents.trim().length === 0) {
      empty.push(doc.label);
    }
  }

  if (missing.length > 0 || empty.length > 0) {
    return {
      name: 'project docs',
      status: 'warn',
      message: 'Project memory files need attention.',
      details: { missing, empty },
    };
  }

  return {
    name: 'project docs',
    status: 'pass',
    message: 'project/info.md, project/todo.md, and project/guidelines.md are present and non-empty.',
  };
}
