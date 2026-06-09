import { ClusterState } from "../src/cluster/ClusterState";

const clusterState = new ClusterState([
  { nodeId: "node-1", host: "127.0.0.1", port: 7379 },
  { nodeId: "node-2", host: "127.0.0.1", port: 7380 },
  { nodeId: "node-3", host: "127.0.0.1", port: 7381 },
]);

clusterState.markUp("node-1");
clusterState.markUp("node-2");
clusterState.markUp("node-3");
console.log("Initial cluster state:", clusterState.getNodes());

clusterState.markDown("node-2", "simulated follower failure");
console.log("After simulated follower failure:", clusterState.getNodes());

clusterState.markDown("node-1", "simulated leader failure");
console.log("After simulated leader failure:", clusterState.getNodes());
