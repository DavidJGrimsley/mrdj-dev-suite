import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type RulesetRule = {
  type: string;
  parameters?: Record<string, unknown>;
};

type BranchRuleset = {
  name: string;
  target: string;
  enforcement: string;
  conditions: {
    ref_name: {
      include: string[];
      exclude: string[];
    };
  };
  rules: RulesetRule[];
  bypass_actors: unknown[];
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const rulesetPath = path.join(repositoryRoot, '.github', 'rulesets', 'test.json');
const documentationPath = path.join(repositoryRoot, 'docs', 'github-test-branch-ruleset.md');

async function readRuleset(): Promise<BranchRuleset> {
  return JSON.parse(await readFile(rulesetPath, 'utf8')) as BranchRuleset;
}

function findRule(ruleset: BranchRuleset, type: string): RulesetRule {
  const rule = ruleset.rules.find((candidate) => candidate.type === type);
  if (!rule) {
    throw new Error(`Expected ruleset rule: ${type}`);
  }
  return rule;
}

describe('test branch ruleset preset', () => {
  it('targets only the test branch and has no bypass actors', async () => {
    const ruleset = await readRuleset();

    expect(ruleset.name).toBe('MDS test branch (automated merge)');
    expect(ruleset.target).toBe('branch');
    expect(ruleset.enforcement).toBe('active');
    expect(ruleset.conditions.ref_name).toEqual({
      include: ['refs/heads/test'],
      exclude: [],
    });
    expect(ruleset.bypass_actors).toEqual([]);
  });

  it('protects the branch and requires the repository CI checks', async () => {
    const ruleset = await readRuleset();
    const pullRequestRule = findRule(ruleset, 'pull_request');
    const statusChecksRule = findRule(ruleset, 'required_status_checks');
    const statusParameters = statusChecksRule.parameters as {
      required_status_checks: Array<{ context: string; integration_id?: number }>;
      strict_required_status_checks_policy: boolean;
    };

    expect(ruleset.rules.map((rule) => rule.type)).toEqual([
      'deletion',
      'non_fast_forward',
      'pull_request',
      'required_status_checks',
    ]);
    expect(statusParameters.required_status_checks).toEqual([
      { context: 'Packages CI / packages' },
      { context: 'Doctor (smoke) / doctor' },
    ]);
    expect(statusParameters.strict_required_status_checks_policy).toBe(true);
    expect(pullRequestRule.parameters).toMatchObject({
      require_code_owner_review: false,
      require_last_push_approval: false,
      required_approving_review_count: 0,
    });
  });

  it('documents non-activating CLI and UI application procedures', async () => {
    const documentation = await readFile(documentationPath, 'utf8');

    expect(documentation).toContain('gh api --method POST repos/OWNER/REPO/rulesets');
    expect(documentation).toContain('Settings → Rules → Rulesets');
    expect(documentation).toContain('Allow auto-merge');
    expect(documentation).toContain('does not run these commands automatically');
    expect(documentation).toContain('No branch creation, ruleset activation, merge, or roadmap update');
  });
});
