# Experiment 01: Hidden Classes

## Purpose

Demonstrates how V8 creates hidden classes (shapes/maps) for objects and how inconsistent property order causes shape instability, leading to polymorphic property access.

## Hypothesis

**Baseline**: Objects created with consistent property order share hidden classes → monomorphic property access → fast

**Deopt variant**: Objects with different property orders have different hidden classes → polymorphic/megamorphic access → slow

**Fixed variant**: Normalizing objects to consistent shape → monomorphic access → fast

## How to Run

```bash
# Baseline (consistent shapes)
npm run exp -- --exp 01-hidden-classes --variant baseline --trace on

# Deopt (inconsistent shapes)
npm run exp -- --exp 01-hidden-classes --variant deopt --trace on

# Fixed (normalized shapes)
npm run exp -- --exp 01-hidden-classes --variant fixed --trace on
```

## What to Look For

**In baseline**:
- Property access function optimized
- IC stays MONOMORPHIC
- Fast execution

**In deopt variant**:
- IC transitions to POLYMORPHIC or MEGAMORPHIC
- Property access `obj.x` and `obj.y` show multiple maps
- Significantly slower (2-5x)

**In fixed variant**:
- Property access monomorphic (like baseline)
- Performance restored

## Key Takeaways

1. Property order matters - `{x, y}` and `{y, x}` are different hidden classes
2. V8 optimizes property access based on observed shapes
3. Normalize objects at boundaries to maintain shape consistency
4. Classes naturally enforce consistent shapes

## Related

- Docs: `docs/01-v8-optimization-mental-model.md` (Hidden Classes section)
- Docs: `docs/03-deopt-bestiary.md` (Shape Instability)
- Experiments: `02-inline-caches`
