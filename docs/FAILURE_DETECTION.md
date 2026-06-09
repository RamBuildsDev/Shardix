# Failure Detection

Shardix uses heartbeats to track peer health.

Heartbeat command:

```txt
PING
```

Response:

```txt
PONG
```

The `HeartbeatManager` checks configured peers. `ClusterState` records each peer
as:

- `UP`
- `DOWN`

If a peer does not respond before the timeout, it is marked `DOWN`.

The current implementation is intentionally simple. It does not yet distinguish
slow nodes from crashed nodes, and it does not implement quorum-based decisions.
