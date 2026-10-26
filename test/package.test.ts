/**
 * Tests of the built package as consumers see it: module formats, and bundling for the browser.
 * Requires `npm run build` (run automatically by `npm test`).
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'tsdown';
import { afterAll, describe, expect, it } from 'vitest';
import * as esm from '../dist/index.mjs';

const require = createRequire(import.meta.url);
const CLASSES = ['Token', 'LexError', 'Lexicon', 'Lexer'] as const;

describe('CommonJS build', () => {
  const lexis = require('../dist/index.cjs');

  it('exports the lexis function itself, like 0.0.x', () => {
    expect(typeof lexis).toBe('function');
    expect(lexis.name).toBe('lexis');
  });

  it('carries the classes as properties', () => {
    for (const name of CLASSES) expect(typeof lexis[name]).toBe('function');
  });
});

describe('ES module build', () => {
  it('default-exports the lexis function', () => {
    expect(typeof esm.default).toBe('function');
  });

  it('named exports are the same classes as the lexis properties', () => {
    for (const name of CLASSES) expect(esm[name]).toBe(esm.default[name]);
  });
});

describe('browser bundling', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lexis-browser-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('bundles for the browser and runs without Node globals', async () => {
    // A consumer app with lexis installed: only the files that ship (package.json + dist).
    const installed = join(dir, 'node_modules', 'lexis');
    mkdirSync(installed, { recursive: true });
    cpSync('package.json', join(installed, 'package.json'));
    cpSync('dist', join(installed, 'dist'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', private: true }));
    writeFileSync(
      join(dir, 'app.mjs'),
      `import lexis, { LexError } from 'lexis';
      globalThis.run = async () => ({
        tokens: (await lexis({ WORD: 'RE::[a-z]+', SP: ' ' }).lex('hi there')).map(String),
        error: await lexis({ WORD: 'RE::[a-z]+' }).lex('hi!').catch((e) => e instanceof LexError && e.message),
      });`,
    );
    await build({
      config: false,
      cwd: dir,
      entry: { app: join(dir, 'app.mjs') },
      outDir: join(dir, 'out'),
      platform: 'browser',
      format: 'iife',
      dts: false,
      logLevel: 'silent',
    });
    const bundle = readFileSync(join(dir, 'out', 'app.iife.js'), 'utf8');

    // A browser-like global scope: timers and promises, but no process, require, module or Buffer.
    const sandbox: Record<string, unknown> = { setTimeout, console };
    runInNewContext(bundle, sandbox);
    const run = sandbox.run as () => Promise<unknown>;
    expect(await run()).toEqual({
      tokens: ['WORD<"hi">:1', 'SP<" ">:1', 'WORD<"there">:1', 'EOF<"">:1'],
      error: 'Unrecognized token: !',
    });
  });
});
