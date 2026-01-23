# Experiment Template

Use this template to create new experiments.

## How to Use

1. Copy this directory:
   ```bash
   cp -r experiments/_template experiments/XX-your-experiment-name
   ```

2. Fill in this README with:
   - Purpose: What optimization/deopt pattern does this demonstrate?
   - Hypothesis: What should happen in each variant?
   - How to run
   - What to look for in traces/output
   - What mitigation is demonstrated

3. Implement the three variants:
   - `baseline.js`: Optimizable version
   - `deopt.js`: Version that triggers deopt
   - `fixed.js`: Mitigation/best practice version

4. Test your experiment:
   ```bash
   npm run exp -- --exp XX-your-experiment-name --variant baseline
   npm run exp -- --exp XX-your-experiment-name --variant deopt --trace on
   npm run exp -- --exp XX-your-experiment-name --variant fixed
   ```

## Experiment Structure

### Purpose

[Describe what this experiment demonstrates. Examples:]
- Demonstrates how property order affects hidden classes
- Shows the performance impact of elements kind transitions
- Illustrates try-catch bailout behavior

### Hypothesis

**Baseline**: [What should happen? E.g., "Function should optimize; monomorphic property access"]

**Deopt variant**: [What deopt should occur? E.g., "Shape instability causes repeated deopts"]

**Fixed variant**: [How does the fix improve things? E.g., "Consistent shapes enable stable optimization"]

### How to Run

```bash
# Baseline (should optimize)
npm run exp -- --exp XX-your-experiment-name --variant baseline --trace on

# Deopt (should trigger deopts)
npm run exp -- --exp XX-your-experiment-name --variant deopt --trace on

# Fixed (mitigation)
npm run exp -- --exp XX-your-experiment-name --variant fixed --trace on
```

### What to Look For

**In baseline**:
- [ ] Function marked for optimization
- [ ] No deopts during measurement
- [ ] Fast execution time

**In deopt variant**:
- [ ] Deopt messages with reason: [expected reason]
- [ ] Slower execution time
- [ ] [Other specific indicators]

**In fixed variant**:
- [ ] Function optimized
- [ ] No deopts
- [ ] Performance similar to or better than baseline

### Expected Trace Output

**Baseline**:
```
[marking 0x... <JSFunction yourFunction> for optimization]
```

**Deopt**:
```
[deoptimizing (DEOPT eager): begin 0x... <JSFunction yourFunction>]
    Reason: [Expected reason]
```

**Fixed**:
```
[marking 0x... <JSFunction yourFunction> for optimization]
(no deopts)
```

### Mitigation Explained

[Explain the fix. E.g.:]
- Instead of X, do Y because...
- This works because V8 can...
- The trade-off is..., which is acceptable because...

### Key Takeaways

1. [First lesson]
2. [Second lesson]
3. [When to apply this pattern]

### Related

- Docs: [Link to relevant doc section]
- Experiments: [Link to related experiments]
