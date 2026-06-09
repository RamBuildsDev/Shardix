# Sharding

Shardix routes keys across shard nodes with:

```txt
hash(key) % numberOfShards
```

Components:

- `HashRouter`: hashes a key and selects a shard index.
- `ShardMap`: stores shard addresses.
- `ShardRouter`: sends key-based commands to the selected shard.
- `ShardRouterServer`: exposes shard routing over TCP.

Keyed commands route to one shard:

- `SET`
- `GET`
- `DELETE`
- `EXISTS`

Cluster-wide commands fan out:

- `KEYS`
- `SIZE`
- `CLEAR`

Shard rebalancing and consistent hashing are future improvements.
