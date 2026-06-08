import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { ShardixNode } from "../src/cluster/ShardixNode";

const host = "127.0.0.1";
const leaderWalPath = join(process.cwd(), "data", "test-node-leader.log");
const followerWalPath = join(process.cwd(), "data", "test-node-follower.log");

describe("ShardixNode leader-follower replication", () => {
  const nodes: ShardixNode[] = [];

  afterEach(async () => {
    await Promise.all(nodes.splice(0).map((node) => node.stop()));
    removeTestLogs();
  });

  it("start leader and follower replicate SET and DELETE", async () => {
    const { leader, follower } = await startLeaderAndFollower(nodes);
    const leaderClient = new ShardixClient({ host, port: leader.getPort() });
    const followerClient = new ShardixClient({ host, port: follower.getPort() });

    await leaderClient.connect();
    await followerClient.connect();

    expect(await leaderClient.set("name", "Siva")).toBe("OK");
    expect(await followerClient.get("name")).toBe("Siva");

    expect(await leaderClient.delete("name")).toBe("DELETED");
    expect(await followerClient.get("name")).toBe("KEY_NOT_FOUND");

    await leaderClient.disconnect();
    await followerClient.disconnect();
  });

  it("follower rejects direct client writes", async () => {
    const { follower } = await startLeaderAndFollower(nodes);
    const followerClient = new ShardixClient({ host, port: follower.getPort() });

    await followerClient.connect();

    expect(await followerClient.set("city", "Hyderabad")).toBe("NOT_LEADER");

    await followerClient.disconnect();
  });

  it("follower data survives restart using its own WAL", async () => {
    const { leader, follower } = await startLeaderAndFollower(nodes);
    const leaderClient = new ShardixClient({ host, port: leader.getPort() });

    await leaderClient.connect();
    expect(await leaderClient.set("name", "Siva")).toBe("OK");
    await leaderClient.disconnect();

    await follower.stop();
    nodes.splice(nodes.indexOf(follower), 1);

    const restartedFollower = new ShardixNode({
      nodeId: "node-2",
      role: "follower",
      host,
      port: 0,
      walPath: followerWalPath,
      peers: [],
    });
    await restartedFollower.start();
    nodes.push(restartedFollower);

    const followerClient = new ShardixClient({
      host,
      port: restartedFollower.getPort(),
    });
    await followerClient.connect();

    expect(await followerClient.get("name")).toBe("Siva");

    await followerClient.disconnect();
  });
});

async function startLeaderAndFollower(nodes: ShardixNode[]): Promise<{
  leader: ShardixNode;
  follower: ShardixNode;
}> {
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

  const leader = new ShardixNode({
    nodeId: "node-1",
    role: "leader",
    host,
    port: 0,
    walPath: leaderWalPath,
    peers: [
      {
        nodeId: "node-2",
        host,
        port: follower.getPort(),
      },
    ],
  });
  await leader.start();
  nodes.push(leader);

  return { leader, follower };
}

function removeTestLogs(): void {
  for (const path of [leaderWalPath, followerWalPath]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
