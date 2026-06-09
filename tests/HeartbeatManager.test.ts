import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { ClusterState } from "../src/cluster/ClusterState";
import { HeartbeatManager } from "../src/cluster/HeartbeatManager";
import type { PeerConfig } from "../src/cluster/NodeConfig";
import { ShardixNode } from "../src/cluster/ShardixNode";

const host = "127.0.0.1";
const followerWalPath = join(process.cwd(), "data", "test-heartbeat-follower.log");

describe("HeartbeatManager", () => {
  const nodes: ShardixNode[] = [];

  afterEach(async () => {
    await Promise.all(nodes.splice(0).map((node) => node.stop()));
    removeTestLogs();
  });

  it("follower responds to PING with PONG", async () => {
    const follower = await startFollower(nodes);
    const client = new ShardixClient({ host, port: follower.getPort() });

    await client.connect();
    const response = await client.send("PING");
    await client.disconnect();

    expect(response).toBe("PONG");
  });

  it("marks a healthy peer UP", async () => {
    const follower = await startFollower(nodes);
    const peer = createPeer("node-2", follower.getPort());
    const clusterState = new ClusterState([peer]);
    const heartbeatManager = new HeartbeatManager([peer], clusterState, {
      timeoutMs: 200,
    });

    await heartbeatManager.checkOnce();

    expect(clusterState.getNode("node-2")?.status).toBe("UP");
    expect(clusterState.getNode("node-2")?.lastSeenAt).toBeTypeOf("number");
  });

  it("marks an unreachable peer DOWN", async () => {
    const peer = createPeer("node-missing", 65530);
    const clusterState = new ClusterState([peer]);
    const heartbeatManager = new HeartbeatManager([peer], clusterState, {
      timeoutMs: 50,
    });

    await heartbeatManager.checkOnce();

    expect(clusterState.getNode("node-missing")?.status).toBe("DOWN");
    expect(clusterState.getNode("node-missing")?.lastError).toBeTruthy();
  });

  it("tracks multiple peers independently", async () => {
    const follower = await startFollower(nodes);
    const healthyPeer = createPeer("node-healthy", follower.getPort());
    const missingPeer = createPeer("node-missing", 65531);
    const clusterState = new ClusterState([healthyPeer, missingPeer]);
    const heartbeatManager = new HeartbeatManager(
      [healthyPeer, missingPeer],
      clusterState,
      { timeoutMs: 50 }
    );

    await heartbeatManager.checkOnce();

    expect(clusterState.getNode("node-healthy")?.status).toBe("UP");
    expect(clusterState.getNode("node-missing")?.status).toBe("DOWN");
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

function createPeer(nodeId: string, port: number): PeerConfig {
  return {
    nodeId,
    host,
    port,
  };
}

function removeTestLogs(): void {
  if (existsSync(followerWalPath)) {
    unlinkSync(followerWalPath);
  }
}
