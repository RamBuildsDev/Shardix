import { describe, expect, it } from "vitest";
import { ClusterState } from "../src/cluster/ClusterState";
import { ElectionManager } from "../src/cluster/ElectionManager";
import type { PeerConfig } from "../src/cluster/NodeConfig";

describe("ElectionManager", () => {
  it("keeps the current leader when it is healthy", () => {
    const nodes = createNodes();
    const clusterState = new ClusterState(nodes);
    clusterState.markUp("node-1");
    clusterState.markUp("node-2");
    const electionManager = new ElectionManager(clusterState, nodes);

    expect(electionManager.electLeader("node-1")).toEqual({
      leaderId: "node-1",
      changed: false,
    });
  });

  it("elects the lowest healthy follower when leader is down", () => {
    const nodes = createNodes();
    const clusterState = new ClusterState(nodes);
    clusterState.markDown("node-1");
    clusterState.markUp("node-2");
    clusterState.markUp("node-3");
    const electionManager = new ElectionManager(clusterState, nodes);

    expect(electionManager.electLeader("node-1")).toEqual({
      leaderId: "node-2",
      changed: true,
    });
  });

  it("skips down followers during election", () => {
    const nodes = createNodes();
    const clusterState = new ClusterState(nodes);
    clusterState.markDown("node-1");
    clusterState.markDown("node-2");
    clusterState.markUp("node-3");
    const electionManager = new ElectionManager(clusterState, nodes);

    expect(electionManager.electLeader("node-1")).toEqual({
      leaderId: "node-3",
      changed: true,
    });
  });

  it("returns undefined when no healthy candidate exists", () => {
    const nodes = createNodes();
    const clusterState = new ClusterState(nodes);
    const electionManager = new ElectionManager(clusterState, nodes);

    expect(electionManager.electLeader("node-1")).toEqual({
      leaderId: undefined,
      changed: false,
    });
  });
});

function createNodes(): PeerConfig[] {
  return [
    { nodeId: "node-1", host: "127.0.0.1", port: 7379 },
    { nodeId: "node-2", host: "127.0.0.1", port: 7380 },
    { nodeId: "node-3", host: "127.0.0.1", port: 7381 },
  ];
}
