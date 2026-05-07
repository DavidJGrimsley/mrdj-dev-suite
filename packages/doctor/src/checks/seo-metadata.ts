import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { findFiles, pathExists, readOptionalText, SOURCE_EXTENSIONS } from '../utils.js';

export async function checkSeoMetadata(projectPath: string): Promise<DoctorCheckResult> {
  const appDirs = [path.join(projectPath, 'app'), path.join(projectPath, 'src', 'app')];
  const hasAppDir = await Promise.all(appDirs.map((appDir) => pathExists(appDir)));
  if (!hasAppDir.some(Boolean)) {
    return {
      name: 'seo metadata',
      status: 'skip',
      message: 'No Expo Router app directory found.',
    };
  }

  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  const searchableText = (
    await Promise.all(sourceFiles.slice(0, 500).map((filePath) => readOptionalText(filePath)))
  )
    .filter((value): value is string => Boolean(value))
    .join('\n');

  const signals = {
    title: /\b(title|metadata|Head)\b/i.test(searchableText),
    description: /\b(description|og:description|twitter:description)\b/i.test(searchableText),
    canonical: /\b(canonical|og:url)\b/i.test(searchableText),
    sitemap: await pathExists(path.join(projectPath, 'public', 'sitemap.xml')),
    robots: await pathExists(path.join(projectPath, 'public', 'robots.txt')),
  };

  const missing = Object.entries(signals)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  if (missing.length > 0) {
    return {
      name: 'seo metadata',
      status: 'warn',
      message: 'Web metadata strategy has gaps.',
      details: { missing },
    };
  }

  return {
    name: 'seo metadata',
    status: 'pass',
    message: 'Basic web metadata signals are present.',
  };
}

