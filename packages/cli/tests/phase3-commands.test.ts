import { describe, expect, it } from 'vitest';

import { explainTopic } from '../src/commands/explain.js';
import { renderMarkdownReport } from '../src/commands/report.js';
import { renderDeveloperCopyMarkdown } from '../src/developer-copy.js';
import { listSkillSummaries } from '../src/commands/skills.js';

import { createModeSelection } from '@mr.dj2u/doctor';
import type { DoctorReport } from '@mr.dj2u/doctor';

describe('Phase 3 command helpers', () => {
  it('lists bundled skills and filters by query', () => {
    const allSkills = listSkillSummaries();
    const routerSkills = listSkillSummaries('router');
    const seoSkills = listSkillSummaries('seo');

    expect(allSkills.length).toBeGreaterThan(0);
    expect(allSkills.some((skill) => skill.id === 'dev-server-management')).toBe(true);
    expect(allSkills.some((skill) => skill.id === 'production-server-patterns')).toBe(true);
    expect(allSkills.some((skill) => skill.id === 'seo-metadata')).toBe(true);
    expect(allSkills.some((skill) => skill.id === 'debugging')).toBe(true);
    expect(allSkills.some((skill) => skill.id === 'project-onboarding')).toBe(true);
    expect(routerSkills.some((skill) => skill.id === 'expo-router-architecture')).toBe(true);
    expect(
      routerSkills.every((skill) =>
        [skill.id, skill.name, skill.description, ...skill.tags].join(' ').toLowerCase().includes('router')
      )
    ).toBe(true);
    expect(seoSkills.some((skill) => skill.id === 'seo-metadata')).toBe(true);
  });

  it('explains exact Doctor check topics without becoming ambiguous', async () => {
    const result = await explainTopic('env-hygiene');

    expect(result.status).toBe('found');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.type).toBe('doctor');
    expect(result.matches[0]?.name).toBe('Env Hygiene');
  });

  it('surfaces ambiguous broad explain topics', async () => {
    const result = await explainTopic('expo');

    expect(result.status).toBe('ambiguous');
    expect(result.matches.length).toBeGreaterThan(1);
  });

  it('renders a Markdown Doctor report', () => {
    const report: DoctorReport = {
      projectPath: 'F:/ReactNativeApps/Demo',
      timestamp: '2026-05-12T00:00:00.000Z',
      mode: 'fast',
      selection: createModeSelection('fast', true),
      summary: {
        score: 95,
        errors: 0,
        warnings: 1,
        passed: 1,
        skipped: 0,
      },
      checks: [
        {
          name: 'project docs',
          status: 'pass',
          message: 'Project memory files exist.',
        },
        {
          name: 'env hygiene',
          status: 'warn',
          message: 'Review env usage.',
          details: { files: ['.env'] },
        },
      ],
    };

    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain('# MDS Doctor Report');
    expect(markdown).toContain('- Default mode: fast');
    expect(markdown).toContain('0 errors, 1 warnings, 1 passed, 0 skipped');
    expect(markdown).toContain('### WARN env hygiene');
    expect(markdown).toContain('"files"');
  });

  it('renders a Markdown developer-copy report', () => {
    const markdown = renderDeveloperCopyMarkdown({
      kind: 'developer-copy',
      projectPath: 'F:/ReactNativeApps/Demo',
      timestamp: '2026-08-16T00:00:00.000Z',
      summary: { findings: 1, errors: 1, warnings: 0 },
      findings: [
        {
          severity: 'error',
          code: 'placeholder-legal',
          file: 'src/features/legal/legal-documents.ts',
          line: 22,
          excerpt: 'This placeholder legal text is not legal advice.',
          message: 'Placeholder legal copy is still in a user-facing file and must be replaced before release.',
        },
      ],
    });

    expect(markdown).toContain('# MDS Developer Copy Report');
    expect(markdown).toContain('1 errors, 0 warnings, 1 findings');
    expect(markdown).toContain('### ERROR placeholder-legal');
    expect(markdown).toContain('src/features/legal/legal-documents.ts:22');
  });
});
