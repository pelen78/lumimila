import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
test('public deployment excludes the card editor, print assets and custom fonts', async () => {
  for (const path of ['dist/cards', 'dist/assets/cards', 'dist/_tarjetas', 'dist/.local']) {
    await assert.rejects(stat(new URL(path, root)), { code: 'ENOENT' });
  }
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  assert.doesNotMatch(html, /id="card-editor"|id="card-download"|cards\/editor\.mjs|assets\/cards\//);
  assert.match(html, /Tarjetas, próximamente/);
  assert.match(html, /if \(route.startsWith\('tarjetas\/'\)\) route = 'tarjetas'/);
});
