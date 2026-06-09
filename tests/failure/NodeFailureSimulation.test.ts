import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ClusterState } from "../../src/cluster/ClusterState";
import { HeartbeatManager } from "../../src/cluster/HeartbeatManager";
import { ShardixNode } from "../../src/cluster/ShardixNode";

const host = "127.0.0.1";
const followerWalPath = join(process.cwd(), "data", "test-failure-follower.log");

describe("node failure simulation", () => {
  let follower: ShardixNode | undefined;

  afterEach(async () => {
    await follower?.stop();
    follower = undefined;
    removeTestLog();
  });

  it("detects follower failure after node stops", async () => {
    removeTestLog();
    follower = new ShardixNode({
      nodeId: "node-2",
      role: "follower",
      host,
      port: 0,
      walPath: followerWalPath,
      peers: [],
    });
    await follower.start();
    const peer = { nodeId: "node-2", host, port: follower.getPort() };
    const clusterState = new ClusterState([peer]);
    const heartbeatManager = new HeartbeatManager([peer], clusterState, {
      timeoutMs: 50,
    });

    await heartbeatManager.checkOnce();
    expect(clusterState.getNode("node-2")?.status).toBe("UP");

    await follower.stop();
    follower = undefined;
    await heartbeatManager.checkOnce();

    expect(clusterState.getNode("node-2")?.status).toBe("DOWN");
  });
});

function removeTestLog(): void {
  if (existsSync(followerWalPath)) {
    unlinkSync(followerWalPath);
  }
}
