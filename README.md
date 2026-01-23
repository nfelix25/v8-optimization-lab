# Node.js V8 JIT Optimization Laboratory

A comprehensive, hands-on learning repository for understanding how Node.js and V8 optimize JavaScript—and more importantly, how to detect and avoid deoptimizations.

**Philosophy**: Evidence over cargo culting. Every pattern is backed by runnable experiments and measurable evidence.

## 🎯 What You'll Learn

- How V8's JIT compiler optimizes your code (and when it doesn't)
- How to detect deoptimizations using V8 tracing flags
- Common deopt triggers: shape instability, polymorphism, type confusion
- Practical patterns for writing optimization-friendly code
- How to profile and measure performance correctly
- Node.js-specific performance considerations (GC, async overhead, buffers)

## 🚀 Quick Start

### Option 1: Web Interface (Recommended for Beginners)

```bash
# Clone/navigate to this repository
cd node-v8-jit-lab

# Install dependencies
npm install

# Start the web interface (launches both backend and frontend)
npm run dev
```

Then open:
- **Frontend**: http://localhost:3000 (Interactive UI)
- **API**: http://localhost:4000 (Backend)

The web interface provides:
- 📚 **Browse documentation** with syntax highlighting
- 🧪 **Run experiments** through an intuitive form
- 📊 **View live logs** as experiments execute
- 📈 **Compare results** visually
- 💾 **Download artifacts** (traces, CPU profiles)

### Option 2: Command Line Interface

```bash
# Install
npm install

# Run your first experiment via CLI
npm run exp -- --exp 01-hidden-classes --variant baseline
npm run exp -- --exp 01-hidden-classes --variant deopt --trace on

# View results
npm run summarize
```

## 📚 Learning Path

### Beginner Path (Days 1-3)

Start here if you're new to V8 optimization:

1. **Read the mental model**: `docs/01-v8-optimization-mental-model.md`
   - Understand how Ignition, Sparkplug, Maglev, and TurboFan cooperate
   - Learn about hidden classes, inline caches, and speculation

2. **Learn the tools**: `docs/02-tooling-node-v8-flags.md`
   - How to use `--trace-opt`, `--trace-deopt`, `--trace-ic`
   - Reading trace output
   - CPU profiling basics

3. **Run core experiments**:
   - `01-hidden-classes` - Property order matters
   - `02-inline-caches` - Monomorphic vs megamorphic
   - `03-elements-kinds` - Array type stability

**Goal**: Can explain "hidden class" and "deopt" with evidence from traces.

### Intermediate Path (Days 4-7)

4. **Study the deopt bestiary**: `docs/03-deopt-bestiary.md`
   - Catalog of common deopts
   - How to detect each one
   - Mitigation patterns

5. **Run deopt-focused experiments**:
   - `04-numbers-smis-doubles` - Integer vs float performance
   - `05-polymorphism-megamorphism` - The performance cliff
   - `06-try-catch-and-bailouts` - Optimization blockers
   - `07-arguments-and-rest` - Modern vs legacy patterns
   - `09-delete-in-operators` - Shape stability killers

**Goal**: Can predict likely deopts in code and verify with traces.

### Advanced Path (Days 8-12)

6. **Learn optimization patterns**: `docs/04-patterns-for-stable-performance.md`
   - Normalization at boundaries
   - Monomorphic call sites
   - Hot path discipline

7. **Node.js runtime specifics**: `docs/05-node-runtime-perf-gotchas.md`
   - GC and allocation pressure
   - Async/await overhead
   - Buffers vs arrays
   - Event loop blocking

8. **Run advanced experiments**:
   - `12-string-concats-and-slices` - String building patterns
   - `13-json-parse-shapes` - Parsing consistency
   - `16-gc-allocation-pressure` - Memory management
   - `17-async-await-microtasks` - Async overhead
   - `20-realistic-mini-server-hotpath` - Real-world scenario

**Goal**: Can apply optimization thinking to production code.

## 📂 Repository Structure

```
/
├── README.md                    # You are here
├── package.json                 # Workspace configuration
├── frontend/                    # Next.js web interface
│   ├── app/                    # Pages (docs, experiments, runs)
│   └── components/             # React components
├── server/                      # Express API backend
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   └── services/          # Business logic (RunService, etc.)
│   └── package.json
├── docs/                        # Comprehensive guides
│   ├── 00-how-to-use-this-repo.md
│   ├── 01-v8-optimization-mental-model.md
│   ├── 02-tooling-node-v8-flags.md
│   ├── 03-deopt-bestiary.md
│   ├── 04-patterns-for-stable-performance.md
│   ├── 05-node-runtime-perf-gotchas.md
│   └── 06-glossary.md
├── scripts/
│   ├── run-experiment.js        # Experiment runner (used by both CLI and web UI)
│   └── summarize-results.js     # Results analyzer
├── experiments/                 # 20 runnable experiments
│   ├── _template/              # Template for creating new experiments
│   ├── 01-hidden-classes/
│   ├── 02-inline-caches/
│   └── ... (20 total experiments)
└── artifacts/                   # Generated results
    └── runs/                   # Run metadata (JSON files)
```

Each experiment contains:
- `README.md` - Purpose, hypothesis, what to look for
- `baseline.js` - Optimizable version
- `deopt.js` - Triggers deoptimization
- `fixed.js` - Mitigation/best practice

## 🔬 Running Experiments

### Basic Usage

```bash
npm run exp -- --exp <experiment-name> --variant <baseline|deopt|fixed>
```

### With V8 Tracing

```bash
npm run exp -- --exp 01-hidden-classes --variant deopt --trace on
```

This runs Node with `--trace-opt`, `--trace-deopt`, and `--trace-ic` flags.

### With CPU Profiling

```bash
npm run exp -- --exp 05-polymorphism-megamorphism --variant deopt --profile on
```

Generates a `.cpuprofile` file for Chrome DevTools.

### Custom Iterations

```bash
npm run exp -- --exp 03-elements-kinds --variant baseline --warmup 5000 --repeat 50000
```

### Analyzing Results

```bash
# View all results
npm run summarize

# Filter by experiment
npm run summarize -- --exp 01-hidden-classes

# Show more history
npm run summarize -- --latest 20
```

## 💡 Daily Practice Loop (15-30 min)

Sustainable learning routine:

1. **Pick one experiment** (5 min)
   - Based on curiosity or recent code you've written

2. **Hypothesize** (2 min)
   - Before running: What should optimize? What should deopt? Why?

3. **Run experiments** (5 min)
   - Baseline + deopt variant, with traces

4. **Examine evidence** (8 min)
   - Read trace output
   - Check timing differences
   - Note deopt reasons

5. **Reflect** (5 min)
   - Was hypothesis correct?
   - What surprised you?
   - How would you apply this?

**Keep a learning journal** - Document surprising findings!

## 🎓 Success Criteria

You've mastered this material when you can:

1. ✅ **Predict**: Look at code and predict likely deopt triggers
2. ✅ **Verify**: Use V8 traces to confirm or refute predictions
3. ✅ **Explain**: Articulate _why_ a deopt happens (not just "it's bad")
4. ✅ **Mitigate**: Apply targeted fixes without cargo-culting
5. ✅ **Judge**: Decide when optimization matters vs premature optimization

## 📖 Key Concepts Reference

### Hidden Classes (Shapes)
Objects with same properties in same order share hidden classes → fast property access.

### Inline Caches (ICs)
- **Monomorphic** (1 type): Fast ⚡
- **Polymorphic** (2-4 types): Okay 👍
- **Megamorphic** (5+ types): Slow 🐌

### Elements Kinds
Arrays optimized by content: `SMI → DOUBLE → OBJECT` (one-way transitions).

### Deoptimization
V8 discards optimized code when assumptions break. Repeated deopts = performance cliff.

## 🔧 Requirements

- **Node.js**: v18+ LTS (tested on v20/v22)
- **OS**: macOS, Linux, Windows
- **Dependencies**: None (zero dependencies)

## 📋 Extending This Repository

To add your own experiment:

```bash
# Copy template
cp -r experiments/_template experiments/21-your-experiment

# Edit files
cd experiments/21-your-experiment
# Fill in README.md, baseline.js, deopt.js, fixed.js

# Test it
npm run exp -- --exp 21-your-experiment --variant baseline
npm run exp -- --exp 21-your-experiment --variant deopt --trace on
```

See `experiments/_template/README.md` for detailed guidance.

## 🧰 Useful Commands

```bash
# List all experiments
ls experiments/

# Clean artifacts
rm -rf artifacts/

# Check Node/V8 version
node --version
node -p process.versions.v8

# Quick trace of any script
node --trace-opt --trace-deopt --trace-ic your-script.js

# CPU profile
node --cpu-prof your-script.js
```

## 🐛 Troubleshooting

### "No results found" when running summarize
```bash
# Run an experiment first
npm run exp -- --exp 01-hidden-classes --variant baseline
npm run summarize
```

### Trace output is too noisy
```bash
# Filter for specific patterns
npm run exp -- --exp 01-hidden-classes --variant deopt --trace on 2>&1 | grep MEGAMORPHIC
```

### Want to see assembly output
```bash
node --print-opt-code --code-comments experiments/01-hidden-classes/baseline.js > asm.txt
```

## 📚 Further Reading

- [V8 Blog](https://v8.dev/blog) - Official V8 team articles
- [Hidden Classes in V8](https://v8.dev/docs/hidden-classes)
- [Elements Kinds in V8](https://v8.dev/blog/elements-kinds)
- [V8 Optimization Killers (older)](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers)
- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/simple-profiling/)

## 🤝 Contributing

Improvements welcome! To contribute:

1. Test your changes with multiple Node versions
2. Run experiments to verify claims
3. Include evidence (traces, profiles)
4. Document Node/V8 version if behavior is version-specific

## 📄 License

MIT

## 💬 FAQ

**Q: Should I apply all these patterns to all my code?**
A: No! Profile first. Only optimize hot paths. Most code doesn't need this.

**Q: Will this make my app faster?**
A: Only if deoptimizations are your bottleneck. Profile to find out.

**Q: What Node version should I use?**
A: v20+ recommended. Patterns apply broadly, but specifics may vary by version.

**Q: Can I use `--allow-natives-syntax` in production?**
A: No. Never. It's experimental and non-portable. Only use in isolated experiments.

**Q: How often does V8 behavior change?**
A: Frequently. Always test on your target Node version. Document version when sharing findings.

**Q: Why are some timings inconsistent?**
A: JIT warmup, GC pauses, CPU throttling. Run multiple times, report median/best-of-N.

## 🎯 Next Steps

1. **Read**: `docs/00-how-to-use-this-repo.md`
2. **Understand**: `docs/01-v8-optimization-mental-model.md`
3. **Learn tools**: `docs/02-tooling-node-v8-flags.md`
4. **Run**: Your first experiment (`01-hidden-classes`)
5. **Practice**: 15-30 min daily

**Remember**: The goal is intuition + evidence, not memorization.

---

**Happy optimizing! 🚀**

*Built with evidence-based learning in mind. Every claim is verifiable through experimentation.*
