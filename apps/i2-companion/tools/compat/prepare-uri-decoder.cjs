/* Keep SDK 57's CommonJS query-string API while using the patched ESM decoder. */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');

const directory = path.dirname(require.resolve('decode-uri-component'));
const packagePath = path.join(directory, 'package.json');
const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(metadata.version, '0.5.0', 'Review the decoder bridge before changing versions');
const source = fs.readFileSync(path.join(directory, 'index.js'), 'utf8');
assert.equal(
  createHash('sha256').update(source).digest('hex'),
  '9401353df38f8010ad7035fe8d666bce6a4902bc1cff809afc4ab23fa2e0bdaa',
  'Decoder source differs from the reviewed 0.5.0 npm package'
);
const declaration = 'export default function decodeUriComponent(';
assert.equal(source.split(declaration).length, 2, 'Expected one default decoder export');
fs.writeFileSync(
  path.join(directory, 'index.cjs'),
  source.replace(declaration, 'module.exports = function decodeUriComponent(')
);
metadata.main = './index.cjs';
metadata.exports = {
  types: './index.d.ts',
  import: './index.js',
  require: './index.cjs',
  default: './index.cjs',
};
fs.writeFileSync(packagePath, JSON.stringify(metadata, null, 2) + '\n');
