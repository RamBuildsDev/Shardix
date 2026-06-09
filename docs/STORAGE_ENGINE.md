# Storage Engine

The storage engine is the smallest database core in Shardix.

It stores:

```ts
Map<string, string>
```

Supported methods:

- `set(key, value)`
- `get(key)`
- `delete(key)`
- `exists(key)`
- `keys()`
- `clear()`
- `size()`

Keys must not be empty or only spaces. Values are strings, and empty string
values are allowed.

The storage engine does not know about TCP, WAL, replication, sharding, Docker,
or CLI behavior. Those live in higher layers.
