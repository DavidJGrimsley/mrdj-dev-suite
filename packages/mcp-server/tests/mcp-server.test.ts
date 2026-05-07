import { describe, expect, it } from 'vitest';

import { executeTool, listResources, readResource } from '../src/index.js';

describe('mrdj MCP helpers', () => {
  it('lists generated knowledge resources', async () => {
    const resources = await listResources();

    expect(resources.some((resource) => resource.uri === 'mrdj://guides/animation-performance')).toBe(
      true
    );
    expect(resources.some((resource) => resource.uri === 'mrdj://reference/mcp-sdk-transport')).toBe(
      true
    );
  });

  it('reads generated knowledge resource content', async () => {
    const resource = await readResource('mrdj://guides/animation-performance');

    expect(resource?.content).toContain('Expo blog');
  });

  it('executes focused Doctor file scans through tool helper', async () => {
    const result = await executeTool('knowledge_list_resources', { kind: 'skill' });

    expect(Array.isArray(result)).toBe(true);
  });
});

