# validation benchmark

Compares `@archi-code/validation` against `class-validator` for every `is*` validator.

## Run

```bash
npm install -w packages/validation   # once, to get tinybench
npm run bench -w packages/validation
```

Set a custom per-task window (default 150ms):

```bash
BENCH_TIME=500 npm run bench -w packages/validation
```

## Modes

- **RAW** — our function vs class-validator's standalone function. Both wrap the
  same underlying `validator.js` logic, so near-parity here is expected and
  confirms the port has no perf regression.
- **DECORATOR** — our function vs `validateSync()` over a class decorated with the
  equivalent `@Is...()`. This captures class-validator's real-world metadata /
  reflection overhead.

## Output

- Two sorted tables in the console (fastest first).
- `benchmark/RESULTS.md` with the decorator-mode comparison.

Columns: `ops/sec` (requests per second), `ns/op` (nanoseconds per call),
`±%` (relative margin of error), `ratio` (ours ÷ class-validator; >1 = ours faster).
Validators with no class-validator equivalent show `—`.
