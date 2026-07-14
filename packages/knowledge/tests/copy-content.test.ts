import { describe, expect, it } from 'vitest';

import { renderClaudeMdsAgent } from '../scripts/copy-content.mjs';

describe('renderClaudeMdsAgent', () => {
  it('includes dedicated motion routing guidance', () => {
    const agentRaw = renderClaudeMdsAgent();

    expect(agentRaw).toContain('## Motion Routing');
    expect(agentRaw).toContain('animation-motion');
    expect(agentRaw).toContain('animation-performance');
    expect(agentRaw).toContain('review_motion');
    expect(agentRaw).toContain('/review-motion');
  });
});
