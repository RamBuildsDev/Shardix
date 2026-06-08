import { ShardixNode } from "./cluster/ShardixNode";
import type { NodeConfig, NodeRole, PeerConfig } from "./cluster/NodeConfig";

const defaultHost = "127.0.0.1";
const defaultPort = 7379;

async function main(): Promise<void> {
  const config = readNodeConfigFromEnv();
  const node = new ShardixNode(config);

  await node.start();
  console.log(
    `Shardix ${config.role} ${config.nodeId} listening on ${config.host}:${config.port}`
  );

  process.on("SIGINT", async () => {
    await node.stop();
    process.exit(0);
  });
}

function readNodeConfigFromEnv(): NodeConfig {
  const nodeId = process.env.NODE_ID ?? "node-1";
  const role = readRole(process.env.ROLE);
  const host = process.env.HOST ?? defaultHost;
  const port = Number(process.env.PORT ?? defaultPort);
  const walPath = process.env.WAL_PATH ?? "data/shardix.log";
  const peers = parsePeers(process.env.PEERS);

  return {
    nodeId,
    role,
    host,
    port,
    walPath,
    peers,
  };
}

function readRole(value: string | undefined): NodeRole {
  if (value === "follower") {
    return "follower";
  }

  return "leader";
}

function parsePeers(value: string | undefined): PeerConfig[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((peer, index) => peer.trim())
    .filter(Boolean)
    .map((peer, index) => {
      const [host, rawPort] = peer.split(":");

      return {
        nodeId: `peer-${index + 1}`,
        host,
        port: Number(rawPort),
      };
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
