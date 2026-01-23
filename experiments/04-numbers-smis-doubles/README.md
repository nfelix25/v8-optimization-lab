# Experiment 04: Numbers - Smis vs Doubles

Demonstrates the performance difference between Smis (31-bit integers stored inline) and HeapNumbers (heap-allocated).

**Key**: Keep hot-path math in Smi range (-2^30 to 2^30-1) for best performance.
