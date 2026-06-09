# WAL And Recovery

Shardix uses a write-ahead log so successful writes survive process restarts.

Logged commands:

- `SET`
- `DELETE`
- `CLEAR`

The WAL stores newline-delimited JSON:

```json
{"type":"SET","key":"name","value":"Siva"}
{"type":"DELETE","key":"name"}
{"type":"CLEAR"}
```

Write flow:

```txt
Append WAL entry -> update memory -> return success
```

Recovery flow:

```txt
Read WAL -> replay entries in order -> rebuild StorageEngine
```

Invalid or corrupted WAL lines are skipped during recovery so valid entries can
still be replayed.
