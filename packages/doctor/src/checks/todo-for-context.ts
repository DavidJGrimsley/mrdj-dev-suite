import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { firstExistingPath } from '../utils.js';

const MARKER = '# TodoForContext(optional):';

interface MarkerHit {
  file: string;
  line: number;
  text: string;
}

export async function checkTodoForContextMarkers(projectPath: string): Promise<DoctorCheckResult> {
  const projectDir = path.join(projectPath, 'project');
  const candidates = [
    { label: 'project/info.md', paths: [path.join(projectDir, 'info.md')] },
    { label: 'project/style.md', paths: [path.join(projectDir, 'style.md')] },
    { label: 'project/guidelines.md', paths: [path.join(projectDir, 'guidelines.md')] },
    {
      label: 'project/todo.md',
      paths: [path.join(projectDir, 'todo.md'), path.join(projectDir, 'TODO.md')],
    },
    { label: 'project/intake-agent.md', paths: [path.join(projectDir, 'intake-agent.md')] },
    { label: 'project/release-flow.md', paths: [path.join(projectDir, 'release-flow.md')] },
  ];

  const hits: MarkerHit[] = [];

  for (const candidate of candidates) {
    const filePath = await firstExistingPath(candidate.paths);
    if (!filePath) {
      continue;
    }

    const contents = await readFile(filePath, 'utf8');
    const lines = contents.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (isUnresolvedMarkerLine(line)) {
        hits.push({
          file: candidate.label,
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  }

  if (hits.length === 0) {
    return {
      name: 'todo-for-context markers',
      status: 'pass',
      message: 'No unresolved # TodoForContext(optional): markers in project memory.',
    };
  }

  return {
    name: 'todo-for-context markers',
    status: 'error',
    message:
      `${hits.length} unresolved # TodoForContext(optional): ${hits.length === 1 ? 'marker' : 'markers'} ` +
      'block agentic onboarding, project intake, and phase work. Fill the section or delete the marker line.',
    details: { hits },
  };
}

function isUnresolvedMarkerLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith(MARKER) || trimmed.startsWith(`- ${MARKER}`) || trimmed.startsWith(`* ${MARKER}`);
}
