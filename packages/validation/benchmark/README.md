# validation benchmark

Measures the performance of every `is*` validator of `@archi-code/validation` on two paths
—**✓ valid** input and **✗ invalid** input— and compares them against the machine's **all-time
best score**, so you can tell at a glance whether a change makes things better or worse.

## How to run it

```bash
npm install -w packages/validation   # once, for tinybench
npm run benchmark -w packages/validation
```

The whole measurement is **repeated several times** (`BENCH_REPEATS`, default **10**) and the
final value of each validator is the **trimmed mean** of those repeats: the slowest one is
discarded (and the fastest one too if there are ≥4) and the rest are averaged. That way an unlucky
run (GC, throttling) does not decide the result. Each repeat measures `BENCH_SAMPLES` samples
(default **10000**). Total ≈ 10 s.

```bash
npm run benchmark -w packages/validation                              # 10 reps × 10000 (default)
BENCH_REPEATS=3 BENCH_SAMPLES=5000 npm run benchmark -w ...           # fast, for iterating
BENCH_REPEATS=20 npm run benchmark -w ...                             # even more stable, slower
```

> It measures a fixed number of samples (not a duration) on purpose: tinybench keeps every
> sample in memory, and measuring "by time" over nanosecond functions produces millions of
> samples and exhausts the RAM. A microbenchmark always has some noise (GC, JIT, CPU
> turbo/throttle); that is why, besides averaging repeats, the colour is "noise-aware" (see
> below): a change within the margin of error is **not** flagged.
>
> While it runs you will see **a single progress bar** (0-100% of all the work):
> `[██████████░░░░░░░░░░] 42%`.

## Where the values under test come from

Each validator provides its own **success** and **error** values in a file inside the
benchmark itself: `benchmark/samples/<validator>.samples.ts`. Each one exports a
`ValidatorSample` with:

- `name` — the validator's name,
- `run(input)` — how to call it (with its args, e.g. `isHash(v, { algorithm: 'md5' })`),
- `valid` / `invalid` — the values to measure.

The benchmark reads them from `benchmark/samples/index.ts`. The samples are input data only: the
benchmark contains no tests, it only runs the validation functions. On start-up, `run.ts` checks
that every `valid` returns `true` and every `invalid` returns `false` (plus unique names and no
duplicate `valid` values); if any sample does not match, it lists the problems and exits with
code 1 without measuring.

## Reference and colours

- Every run saves a **reference** per validator (success and error) in
  `benchmark/best-scores.json` (**local**, ignored by git — timings depend on the hardware).
  The reference **only moves on a real change**: it goes down when you really improve (beyond
  the noise) and stays put on a regression or noise. That way it is not dragged towards a
  "lucky" minimum and does not produce false colours.
- The table shows 4 figures per validator: the **success (ns)** time, its **Δ**, the
  **error (ns)** time and its **Δ**. The **Δ** shows how much it changed vs your reference:
  - 🔴 **red** = slower than the reference (real regression).
  - 🟢 **green** = faster than the reference (real improvement); lowers the reference.
  - ⚪ grey = no real change (within the noise/tolerance).
- `ns` = nanoseconds per call. **Fewer ns = faster.**

**Noise-aware comparison (in both directions):** red/green is only shown if the change exceeds
**both** the fixed tolerance **and** the margin of error (±%) of that measurement. That way
statistical noise is not flagged as a change. Running the same code twice should give almost
all grey.

Fixed tolerance (default 10 %):

```bash
BENCH_TOLERANCE=0.05 npm run benchmark -w packages/validation   # 5%
```

Start from scratch (ignores/overwrites the saved best score):

```bash
BENCH_RESET=1 npm run benchmark -w packages/validation
```

Disable colours (plain-text output; also automatic when the output is not a TTY):

```bash
NO_COLOR=1 npm run benchmark -w packages/validation
```

## Output

- Console table sorted from slowest to fastest (by success): `validator` / `success (ns)`
  / `success Δ` / `error (ns)` / `error Δ`, with an explanation in English above it.
- `benchmark/RESULTS.md` with the same information and the 🔴 / 🟢 / ⚪ indicators.
