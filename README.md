# Shardix

Shardix is a distributed key-value database built from scratch with TypeScript
and Node.js. It is a learning project that implements database and distributed
systems internals in small, understandable layers.

## Features

- In-memory key-value storage
- Command parser and processor
- Write-ahead log persistence
- Crash recovery from WAL
- TCP database server
- CLI client and TypeScript client SDK
- Ordered write queue for safe concurrent writes
- Leader-follower replication
- Heartbeat-based failure detection
- Basic leader election
- Hash-based sharding router
- Docker Compose multi-node setup
- Integration tests, failure simulations, and benchmarks

## Quick Start

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Start a single Shardix server:

```bash
npm run server
```

Start the CLI in another terminal:

```bash
npm run cli
```

Try commands:

```txt
SET name Siva
GET name
DELETE name
KEYS
SIZE
```

## Run A Replicated Cluster

Follower 1:

```bash
NODE_ID=node-2 ROLE=follower PORT=7380 WAL_PATH=data/node-2.log npm run server
```

Follower 2:

```bash
NODE_ID=node-3 ROLE=follower PORT=7381 WAL_PATH=data/node-3.log npm run server
```

Leader:

```bash
NODE_ID=node-1 ROLE=leader PORT=7379 WAL_PATH=data/node-1.log PEERS=127.0.0.1:7380,127.0.0.1:7381 npm run server
```

## Docker

```bash
docker compose up --build
```

The router is exposed on:

```txt
127.0.0.1:7379
```

## Benchmarks And Failure Demo

```bash
npm run benchmark
npm run failure:demo
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Storage Engine](docs/STORAGE_ENGINE.md)
- [WAL and Recovery](docs/WAL_AND_RECOVERY.md)
- [TCP Protocol](docs/TCP_PROTOCOL.md)
- [Replication](docs/REPLICATION.md)
- [Failure Detection](docs/FAILURE_DETECTION.md)
- [Sharding](docs/SHARDING.md)
- [Benchmarks](docs/BENCHMARKS.md)

## Known Limitations

Shardix is intentionally educational. It does not yet implement Raft, quorum
writes, automatic follower catch-up, shard rebalancing, authentication, or a
production-grade wire protocol.
