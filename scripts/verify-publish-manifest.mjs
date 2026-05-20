import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const packageDirs =
  process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync('packages', { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join('packages', entry.name));

const failures = [];

for (const packageDir of packageDirs) {
  const manifestPath = path.join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) {
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const field of dependencyFields) {
    const dependencies = manifest[field];
    if (!dependencies || typeof dependencies !== 'object') {
      continue;
    }

    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        failures.push(`${manifest.name ?? packageDir} ${field}.${name} = ${version}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Publish manifest check failed: workspace protocol dependencies cannot be published to npm.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Publish manifest check passed: no workspace protocol dependencies found.');
