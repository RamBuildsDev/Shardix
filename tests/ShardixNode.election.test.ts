import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShardixClient } from "../src/client/ShardixClient";
import { ShardixNode } from "../src/cluster/ShardixNode";

const host = "127.0.0.1";
const walPath = join(process.cwd(), "data", "test-election-node.log");

describe("ShardixNode election", () => {
  let node: ShardixNode | undefined;

  afterEach(async () => {
    await node?.stop();
    node = undefined;
    removeTestLog();
  });

  it("promotes itself when elected leader", async () => {
    removeTestLog();
    node = new ShardixNode({
      nodeId: "node-2",
      role: "follower",
      host,
      port: 0,
      walPath,
      peers: [],
    });
    await node.start();
    node.getClusterState().addNode({ nodeId: "node-1", host, port: 65530 });
    node.getClusterState().markDown("node-1");

    const electedLeader = node.runElection("node-1");

    expect(electedLeader).toBe("node-2");
    expect(node.getRole()).toBe("leader");
  });

  it("accepts writes after promotion", async () => {
    removeTestLog();
    node = new ShardixNode({
      nodeId: "node-2",
      role: "follower",
      host,
      port: 0,
      walPath,
      peers: [],
    });
    await node.start();
    node.getClusterState().addNode({ nodeId: "node-1", host, port: 65530 });
    node.getClusterState().markDown("node-1");
    node.runElection("node-1");

    const client = new ShardixClient({ host, port: node.getPort() });
    await client.connect();

    expect(await client.set("name", "Siva")).toBe("OK");
    expect(await client.get("name")).toBe("Siva");

    await client.disconnect();
  });
});

function removeTestLog(): void {
  if (existsSync(walPath)) {
    unlinkSync(walPath);
  }
}
