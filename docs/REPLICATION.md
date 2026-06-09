# Replication

Shardix currently supports manual leader-follower replication.

```txt
Client -> Leader -> Followers
```

Rules:

- Leaders accept client writes.
- Followers reject direct client writes with `NOT_LEADER`.
- Followers still serve reads.
- Leaders send internal `REPL` commands to followers.
- Followers write replicated entries to their own WAL and update memory.

Leader write flow:

```txt
Append leader WAL
Update leader memory
Send REPL command to followers
Wait for ACK
Return success to client
```

This phase expects configured followers to be online. Retries and catch-up are
future improvements.
