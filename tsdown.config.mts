import { defineConfig, type UserConfig } from 'tsdown';

const shared: UserConfig = {
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  fixedExtension: true,
};

export default defineConfig([
  // ESM: default export plus named exports.
  { ...shared, entry: { index: 'src/index.ts' }, format: 'esm' },
  // CJS: the lone default export becomes `module.exports = lexis` (cjsDefault).
  { ...shared, entry: { index: 'src/index.cjs.ts' }, format: 'cjs', clean: false },
]);
