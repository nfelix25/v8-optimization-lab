# Experiment 02: Inline Caches

## Purpose

Demonstrates how inline caches (ICs) work and the performance difference between monomorphic, polymorphic, and megamorphic call sites.

## Hypothesis

**Baseline**: Monomorphic call site (1 type) → fast IC lookup
**Deopt variant**: Megamorphic call site (5+ types) → slow generic lookup
**Fixed variant**: Separate monomorphic paths → fast again

## Key Takeaways

1. ICs remember types seen at each call site
2. Monomorphic (1 type) is fastest
3. Polymorphic (2-4 types) is acceptable
4. Megamorphic (5+ types) is slow and permanent
5. Fix: separate code paths for different types

## Related

- Docs: `docs/01-v8-optimization-mental-model.md` (Inline Caches)
- Docs: `docs/03-deopt-bestiary.md` (Polymorphism & Megamorphism)
