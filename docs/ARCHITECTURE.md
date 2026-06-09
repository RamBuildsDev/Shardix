# Architecture

Shardix is built in layers.

```txt
CLI / TypeScript Client
        |
        v
TCP Server / Shard Router
        |
        v
Command Parser
        |
        v
Command Processor
        |
        v
Write Queue
        |
        v
WAL + Storage Engine
```

Distributed mode adds:

```txt
Client -> Router -> Leader -> Followers
```

The leader accepts writes. Followers reject direct writes with `NOT_LEADER` but
accept internal replication commands from the leader.

## Main Components

- `StorageEngine`: in-memory `Map<string, string>`.
- `CommandParser`: converts raw text into typed command objects.
- `CommandProcessor`: applies commands with role and replication rules.
- `WriteAheadLog`: persists successful writes as newline-delimited JSON.
- `RecoveryManager`: rebuilds memory by replaying WAL entries.
- `TcpServer`: exposes Shardix over TCP.
- `ShardixClient`: programmatic TCP client.
- `ShardixNode`: wires one database node together.
- `ReplicationManager`: sends leader writes to followers.
- `HeartbeatManager`: checks peer liveness.
- `ElectionManager`: selects a new leader from healthy candidates.
- `ShardRouter`: routes keys to shards using hashing.
