# Benchmarks

Run:

```bash
npm run benchmark
```

The benchmark script reports:

- SET operations per second
- GET operations per second
- WAL recovery entries per second
- Shard distribution across configured shards

Use a custom operation count:

```bash
BENCHMARK_OPS=50000 npm run benchmark
```

Benchmarks are local development measurements, not production guarantees.
