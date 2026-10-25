/**
 * Lexer benchmark. Runs the same inputs against the legacy or current implementation.
 *
 *   node --expose-gc bench/run.mjs [legacy|current] [--save <file>] [--min-runs N] [--min-ms N]
 *
 * `current` loads the built package (`npm run build` first). Token output is digested so runs across
 * implementations can be compared for identical results, not just speed.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const implName = args[0] && !args[0].startsWith('--') ? args[0] : 'current';
const minRuns = Number(flag('--min-runs', 5));
const minMs = Number(flag('--min-ms', 1000));
const savePath = flag('--save');

if (typeof globalThis.gc !== 'function') {
  console.error('Run with node --expose-gc for heap measurements.');
  process.exit(1);
}

const loaders = {
  legacy: async () => {
    const lexis = createRequire(import.meta.url)('../src/index.js');
    const lex = (lexer, source) =>
      new Promise((resolve, reject) =>
        lexer.lex(source).then((tokens, error) => (tokens ? resolve(tokens) : reject(error))),
      );
    return { lexis, lex };
  },
  current: async () => {
    const { default: lexis } = await import('../dist/index.mjs');
    return { lexis, lex: (lexer, source) => lexer.lex(source) };
  },
};

const RULES = {
  LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}', SEMI: ';', COMMA: ',',
  PLUS: '+', MINUS: '-', STAR: '*', SLASH: '/', EQ: '=', EQEQ: '==', ARROW: '=>',
  NUMBER: 'RE::\\d+', IDENT: 'RE::[A-Za-z_]\\w*', WS: 'RE::[ \\t]+',
};
const UNIT = 'let x1 = (a + 42) * b_2; f => g == 7, {c - d / e}; ';
const line = (n) => UNIT.repeat(Math.ceil(n / UNIT.length)).slice(0, n);

const CASES = [
  { name: 'readme-9', rules: { LPAREN: '(', RPAREN: ')', ALPHANUM: 'RE::[a-zA-Z0-9]+' }, source: '(abc1234)' },
  { name: 'code-200', rules: RULES, source: line(200) },
  { name: 'code-1k-20lines', rules: RULES, source: Array.from({ length: 20 }, () => line(50)).join('\n') },
  { name: 'code-1k-1line', rules: RULES, source: line(1000) },
];

const HEAP_COPIES = 10;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const digest = (tokens) =>
  createHash('sha256').update(tokens.map(String).join('\n')).digest('hex').slice(0, 12);

const { lexis, lex } = await loaders[implName]();

async function measure({ rules, source }) {
  // Warm-up, and the reference output.
  const tokens = await lex(lexis(rules), source);

  const wall = [];
  const cpu = [];
  const loop = monitorEventLoopDelay({ resolution: 1 });
  loop.enable();
  const started = performance.now();
  while (wall.length < minRuns || performance.now() - started < minMs) {
    const c0 = process.cpuUsage();
    const t0 = performance.now();
    await lex(lexis(rules), source);
    wall.push(performance.now() - t0);
    const c = process.cpuUsage(c0);
    cpu.push((c.user + c.system) / 1000);
  }
  loop.disable();

  // Heap retained per finished lexer + tokens, averaged over several so it clears GC noise.
  const fullGc = () => (globalThis.gc(), globalThis.gc());
  fullGc();
  const h0 = process.memoryUsage().heapUsed;
  const lexers = Array.from({ length: HEAP_COPIES }, () => lexis(rules));
  const kept = await Promise.all(lexers.map((lexer) => lex(lexer, source)));
  fullGc();
  const retainedKB = (process.memoryUsage().heapUsed - h0) / 1024 / HEAP_COPIES;

  return {
    chars: source.length,
    tokens: tokens.length,
    digest: digest(tokens),
    runs: wall.length,
    wallMs: median(wall),
    cpuMs: median(cpu),
    charsPerSec: Math.round(source.length / (median(wall) / 1000)),
    maxLoopBlockMs: loop.max / 1e6,
    retainedKB: Math.round(retainedKB * 10) / 10,
    _keep: [kept, lexers],
  };
}

const results = {};
for (const c of CASES) {
  const { _keep, ...r } = await measure(c);
  results[c.name] = r;
  console.log(
    `${implName.padEnd(8)} ${c.name.padEnd(16)} ${String(r.chars).padStart(5)} chars  ` +
      `wall ${r.wallMs.toFixed(2).padStart(9)}ms  cpu ${r.cpuMs.toFixed(2).padStart(8)}ms  ` +
      `${String(r.charsPerSec).padStart(9)} ch/s  block ${r.maxLoopBlockMs.toFixed(1).padStart(6)}ms  ` +
      `heap ${String(r.retainedKB).padStart(7)}KB  [${r.digest}, ${r.tokens} tok, ${r.runs} runs]`,
  );
}

if (savePath) {
  const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
  const meta = {
    impl: implName,
    commit: git('rev-parse --short HEAD'),
    dirty: git('status --porcelain') !== '',
    date: new Date().toISOString(),
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
  };
  writeFileSync(savePath, JSON.stringify({ meta, results }, null, 2) + '\n');
  console.log(`saved ${savePath}`);
}
