import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { ReplicationManager } from "../src/cluster/ReplicationManager";
import { ShardixNode } from "../src/cluster/ShardixNode";

const host = "127.0.0.1";
const followerWalPath = join(process.cwd(), "data", "test-repl-follower.log");

describe("ReplicationManager", () => {
  const nodes: ShardixNode[] = [];

  afterEach(async () => {
    await Promise.all(nodes.splice(0).map((node) => node.stop()));
    removeTestLogs();
  });

  it("leader replicates SET to follower", async () => {
    const follower = await startFollower(nodes);
    const manager = createManager(follower);

    await manager.replicateSet("name", "Siva");

    expect(follower.getStorageEngine().get("name")).toBe("Siva");
  });

  it("leader replicates DELETE to follower", async () => {
    const follower = await startFollower(nodes);
    const manager = createManager(follower);

    await manager.replicateSet("name", "Siva");
    await manager.replicateDelete("name");

    expect(follower.getStorageEngine().get("name")).toBeUndefined();
  });

  it("leader replicates CLEAR to follower", async () => {
    const follower = await startFollower(nodes);
    const manager = createManager(follower);

    await manager.replicateSet("name", "Siva");
    await manager.replicateSet("city", "Hyderabad");
    await manager.replicateClear();

    expect(follower.getStorageEngine().size()).toBe(0);
  });

  it("follower returns ACK for valid replication command", async () => {
    const follower = await startFollower(nodes);
    const client = new ShardixClient({ host, port: follower.getPort() });

    await client.connect();
    const response = await client.send("REPL SET name Siva");
    await client.disconnect();

    expect(response).toBe("ACK");
  });

  it("leader receives ACK from follower", async () => {
    const follower = await startFollower(nodes);
    const manager = createManager(follower);

    await expect(manager.replicateSet("name", "Siva")).resolves.toBeUndefined();
  });
});

async function startFollower(nodes: ShardixNode[]): Promise<ShardixNode> {
  removeTestLogs();

  const follower = new ShardixNode({
    nodeId: "node-2",
    role: "follower",
    host,
    port: 0,
    walPath: followerWalPath,
    peers: [],
  });
  await follower.start();
  nodes.push(follower);

  return follower;
}

function createManager(follower: ShardixNode): ReplicationManager {
  return new ReplicationManager([
    {
      nodeId: "node-2",
      host,
      port: follower.getPort(),
    },
  ]);
}

function removeTestLogs(): void {
  if (existsSync(followerWalPath)) {
    unlinkSync(followerWalPath);
  }
}
