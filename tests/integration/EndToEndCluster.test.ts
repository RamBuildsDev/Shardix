import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../../src/client/ShardixClient";
import type { PeerConfig } from "../../src/cluster/NodeConfig";
import { ShardixNode } from "../../src/cluster/ShardixNode";
import { ShardMap } from "../../src/sharding/ShardMap";
import { ShardRouter } from "../../src/sharding/ShardRouter";

const host = "127.0.0.1";
const leaderWalPath = join(process.cwd(), "data", "test-e2e-leader.log");
const followerWalPath = join(process.cwd(), "data", "test-e2e-follower.log");

describe("end-to-end cluster", () => {
  const nodes: ShardixNode[] = [];

  afterEach(async () => {
    await Promise.all(nodes.splice(0).map((node) => node.stop()));
    removeTestLogs();
  });

  it("routes writes to leader and replicates to follower", async () => {
    removeTestLogs();
    const follower = await startNode("node-2", "follower", followerWalPath);
    nodes.push(follower);
    const leader = await startNode("node-1", "leader", leaderWalPath, [
      { nodeId: "node-2", host, port: follower.getPort() },
    ]);
    nodes.push(leader);
    const router = new ShardRouter(
      new ShardMap([{ shardId: "shard-1", host, port: leader.getPort() }])
    );
    const followerClient = new ShardixClient({ host, port: follower.getPort() });

    expect(await router.set("name", "Siva")).toBe("OK");

    await followerClient.connect();
    expect(await followerClient.get("name")).toBe("Siva");
    await followerClient.disconnect();
  });
});

async function startNode(
  nodeId: string,
  role: "leader" | "follower",
  walPath: string,
  peers: PeerConfig[] = []
): Promise<ShardixNode> {
  const node = new ShardixNode({
    nodeId,
    role,
    host,
    port: 0,
    walPath,
    peers,
  });
  await node.start();
  return node;
}

function removeTestLogs(): void {
  for (const path of [leaderWalPath, followerWalPath]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
