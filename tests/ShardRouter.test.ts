import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { ShardixNode } from "../src/cluster/ShardixNode";
import { ShardRouter } from "../src/sharding/ShardRouter";
import { ShardMap } from "../src/sharding/ShardMap";

const host = "127.0.0.1";
const shardOneWalPath = join(process.cwd(), "data", "test-shard-1.log");
const shardTwoWalPath = join(process.cwd(), "data", "test-shard-2.log");

describe("ShardRouter", () => {
  const nodes: ShardixNode[] = [];

  afterEach(async () => {
    await Promise.all(nodes.splice(0).map((node) => node.stop()));
    removeTestLogs();
  });

  it("routes SET and GET for a key to the same shard", async () => {
    const { router } = await startRouter(nodes);

    expect(await router.set("name", "Siva")).toBe("OK");
    expect(await router.get("name")).toBe("Siva");
  });

  it("distributes keys across shard nodes", async () => {
    const { router, shardOne, shardTwo } = await startRouter(nodes);
    const keyForShardOne = findKeyForShard(router, shardOne.getPort());
    const keyForShardTwo = findKeyForShard(router, shardTwo.getPort());

    await router.set(keyForShardOne, "one");
    await router.set(keyForShardTwo, "two");

    expect(await readFromShard(shardOne, keyForShardOne)).toBe("one");
    expect(await readFromShard(shardTwo, keyForShardTwo)).toBe("two");
  });

  it("aggregates KEYS across shards", async () => {
    const { router } = await startRouter(nodes);

    await router.set("name", "Siva");
    await router.set("city", "Hyderabad");

    expect(JSON.parse(await router.keys())).toEqual(
      expect.arrayContaining(["name", "city"])
    );
  });

  it("aggregates SIZE across shards", async () => {
    const { router } = await startRouter(nodes);

    await router.set("name", "Siva");
    await router.set("city", "Hyderabad");

    expect(await router.size()).toBe("2");
  });

  it("broadcasts CLEAR to all shards", async () => {
    const { router } = await startRouter(nodes);

    await router.set("name", "Siva");
    await router.set("city", "Hyderabad");

    expect(await router.clear()).toBe("OK");
    expect(await router.size()).toBe("0");
  });
});

async function startRouter(nodes: ShardixNode[]): Promise<{
  router: ShardRouter;
  shardOne: ShardixNode;
  shardTwo: ShardixNode;
}> {
  removeTestLogs();

  const shardOne = await startShard("shard-1", shardOneWalPath);
  const shardTwo = await startShard("shard-2", shardTwoWalPath);
  nodes.push(shardOne, shardTwo);

  const router = new ShardRouter(
    new ShardMap([
      { shardId: "shard-1", host, port: shardOne.getPort() },
      { shardId: "shard-2", host, port: shardTwo.getPort() },
    ])
  );

  return { router, shardOne, shardTwo };
}

async function startShard(nodeId: string, walPath: string): Promise<ShardixNode> {
  const node = new ShardixNode({
    nodeId,
    role: "leader",
    host,
    port: 0,
    walPath,
    peers: [],
  });
  await node.start();
  return node;
}

function findKeyForShard(router: ShardRouter, port: number): string {
  for (let index = 0; index < 1000; index += 1) {
    const key = `key:${index}`;

    if (router.getShardForKey(key).port === port) {
      return key;
    }
  }

  throw new Error(`Could not find key for shard on port ${port}`);
}

async function readFromShard(shard: ShardixNode, key: string): Promise<string> {
  const client = new ShardixClient({ host, port: shard.getPort() });

  try {
    await client.connect();
    return await client.get(key);
  } finally {
    await client.disconnect();
  }
}

function removeTestLogs(): void {
  for (const path of [shardOneWalPath, shardTwoWalPath]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
