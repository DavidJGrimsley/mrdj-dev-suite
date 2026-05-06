import { runDoctor } from '@mrdj/doctor';
import { getPattern, listPatterns } from '@mrdj/knowledge';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  content?: string;
}

export function listTools(): MCPTool[] {
  return [
    {
      name: 'doctor_scan_project',
      description: 'Run MrDJ Doctor static and script checks against a project folder.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          mode: { type: 'string', enum: ['fast', 'ci', 'full'] },
          runScripts: { type: 'boolean' },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'knowledge_list_patterns',
      description: 'List harvested MrDJ Expo development patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
        },
      },
    },
  ];
}

export async function listResources(): Promise<MCPResource[]> {
  const patterns = await listPatterns();
  return patterns.map((pattern) => ({
    uri: `mrdj://patterns/${pattern.id}`,
    name: pattern.name,
    mimeType: 'text/markdown',
    content: pattern.description,
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'doctor_scan_project': {
      const projectPath = readString(input.projectPath) ?? '.';
      const mode = readString(input.mode);
      const runScripts = typeof input.runScripts === 'boolean' ? input.runScripts : undefined;
      return runDoctor(projectPath, {
        mode: mode === 'ci' || mode === 'full' || mode === 'fast' ? mode : 'fast',
        runScripts,
      });
    }
    case 'knowledge_list_patterns': {
      return listPatterns();
    }
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

export async function readResource(uri: string): Promise<MCPResource | null> {
  const prefix = 'mrdj://patterns/';
  if (!uri.startsWith(prefix)) {
    return null;
  }

  const pattern = await getPattern(uri.slice(prefix.length));
  if (!pattern) {
    return null;
  }

  return {
    uri,
    name: pattern.name,
    mimeType: 'text/markdown',
    content: [
      `# ${pattern.name}`,
      '',
      pattern.description,
      '',
      `Category: ${pattern.category}`,
      pattern.source ? `Sources: ${pattern.source}` : undefined,
      pattern.references?.length ? `References: ${pattern.references.join(', ')}` : undefined,
    ]
      .filter((line): line is string => typeof line === 'string')
      .join('\n'),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
