import { describe, expect, it } from "vitest";
import { HashRouter } from "../src/sharding/HashRouter";
import { ShardMap } from "../src/sharding/ShardMap";

describe("HashRouter", () => {
  it("routes the same key to the same shard", () => {
    const router = new HashRouter();
    const shardMap = createShardMap();

    expect(router.getShardForKey("user:1", shardMap)).toEqual(
      router.getShardForKey("user:1", shardMap)
    );
  });

  it("routes keys using hash modulo shard count", () => {
    const router = new HashRouter();
    const shardMap = createShardMap();
    const key = "user:1";
    const expectedIndex = router.hash(key) % shardMap.size();

    expect(router.getShardForKey(key, shardMap)).toEqual(
      shardMap.getShard(expectedIndex)
    );
  });

  it("produces non-negative hashes", () => {
    const router = new HashRouter();

    expect(router.hash("session:abc")).toBeGreaterThanOrEqual(0);
  });
});

function createShardMap(): ShardMap {
  return new ShardMap([
    { shardId: "shard-1", host: "127.0.0.1", port: 7379 },
    { shardId: "shard-2", host: "127.0.0.1", port: 7380 },
    { shardId: "shard-3", host: "127.0.0.1", port: 7381 },
  ]);
}
