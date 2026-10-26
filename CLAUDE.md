# lexis

## House rules

1. **Plan before work, update frequently.** Lay out the plan before starting. Before any heads-down
   stretch, say what's happening, roughly how long it will take, and when the next checkpoint is, so
   the user can step away. Post an update at every checkpoint.
2. **Nothing leaves this repo or machine without explicit approval for that specific action.** This
   includes `git push`, opening PRs/issues, `npm publish`, publishing artifacts or docs, and sending
   repo contents to any external service. Approval for one action does not carry over to the next.
3. **Every change starts on a feature branch, never the main branch (`master`).**

## Commands

- `npm run check` — build, tests, typecheck and package lint; run before every commit.
- `npm test` — builds first: the suites also run against `dist/`, and `test/types*.check.*` typecheck the
  shipped declarations.
- `npm run bench -- legacy|current [--compare bench/baseline.json]` — legacy's wall time is dominated by
  one `setTimeout` per lexer step (current yields every ~8 ms); use `npm run bench:compute -- … --compare bench/baseline-compute.json` to
  judge compute changes. CPU time under real timers drifts between sessions; compare interleaved runs.

## Layout notes

- `test/legacy/` is the original 0.0.4 implementation, kept unchanged as the reference that
  `test/behavior.test.ts` and `bench/` compare against.
- Known bugs are pinned in `test/behavior.test.ts` with `it.fails` and the correct expectation.
